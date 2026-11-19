-- Tenant authority is a membership row for auth.uid(). The x-tenant-id header only
-- selects among memberships that already exist. Historical migrations stay unchanged.
--
-- Backfill rule: self-service records are never enrollment evidence. Membership is
-- granted only from operator-only records: user_roles, organization_members,
-- workflow_reviewers, and path_people. Every account that has a profile, submission,
-- introduction request, consent row, or program profile in a tenant it was not
-- granted is listed in private.tenant_membership_review with no grant, whether those
-- records span one tenant or several. Each row is also announced with
-- NOTICE: Tenant membership needs operator review.
--
-- Enrollment rule: enroll_tenant does not take a tenant or organization id. The
-- header only names which active tenant is being requested. That request is
-- authorized when private.tenant_enrollment_policy.open_enrollment is true for
-- that tenant, or when the caller presents a valid, unexpired, single-use
-- invitation bound to that tenant and the account email. A missing policy is closed.
-- The migration opens self-enrollment only for the back2kc slug and records
-- kcnow-concept as invite-only. Later inserts of those slugs get the same policy.
-- Open self-enrollment records at most one membership. A valid invitation can add
-- another tenant even when the account already belongs somewhere else.
begin;

create table public.tenant_members (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
create index tenant_members_user_idx on public.tenant_members(user_id);
alter table public.tenant_members enable row level security;
revoke all on table public.tenant_members from public, anon, authenticated;
grant select, insert, update, delete on table public.tenant_members to service_role;

create table private.tenant_membership_review (
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  sources text[] not null,
  noted_at timestamptz not null default now(),
  primary key (user_id, tenant_id)
);
alter table private.tenant_membership_review enable row level security;
revoke all on table private.tenant_membership_review from public, anon, authenticated;
grant select on table private.tenant_membership_review to service_role;

create function private.reconcile_tenant_memberships() returns void
language plpgsql security definer set search_path='' as $$
declare r record;
begin
  insert into public.tenant_members(tenant_id, user_id)
  select tenant_id, user_id from public.user_roles
  union
  select tenant_id, user_id from public.organization_members
  union
  select tenant_id, user_id from private.workflow_reviewers
  union
  select tenant_id, user_id from private.path_people where user_id is not null
  on conflict do nothing;

  insert into private.tenant_membership_review(user_id, tenant_id, sources)
  select activity.user_id, activity.tenant_id, array_agg(distinct activity.source order by activity.source)
  from (
    select user_id, tenant_id, 'candidate_profiles'::text as source from public.candidate_profiles
    union all
    select user_id, tenant_id, 'submissions' from public.submissions where user_id is not null
    union all
    select candidate_user_id, tenant_id, 'introduction_requests' from public.introduction_requests
    union all
    select user_id, tenant_id, 'communications_consent' from public.communications_consent where user_id is not null
    union all
    select user_id, tenant_id, 'program_profiles' from private.program_profiles
  ) activity
  where not exists (
    select 1 from public.tenant_members m
    where m.user_id = activity.user_id and m.tenant_id = activity.tenant_id
  )
  group by activity.user_id, activity.tenant_id
  on conflict (user_id, tenant_id) do update set sources = excluded.sources, noted_at = now();

  for r in select user_id, tenant_id, sources from private.tenant_membership_review order by user_id, tenant_id loop
    raise notice 'Tenant membership needs operator review: user % tenant % sources %', r.user_id, r.tenant_id, r.sources;
  end loop;
end $$;
revoke all on function private.reconcile_tenant_memberships() from public, anon, authenticated;
select private.reconcile_tenant_memberships();

-- Anonymous catalog reads still follow the deployment header. A signed-in user
-- gets that tenant only when tenant_members already contains the pair.
create or replace function private.current_tenant() returns uuid
language sql stable security definer set search_path='' as $$
  select t.id from public.tenants t
  where t.active
    and t.id::text = coalesce(nullif(current_setting('request.headers', true), '')::jsonb->>'x-tenant-id', '')
    and (
      auth.uid() is null
      or exists (select 1 from public.tenant_members m where m.tenant_id = t.id and m.user_id = auth.uid())
    )
$$;
revoke all on function private.current_tenant() from public;
grant execute on function private.current_tenant() to anon, authenticated;

-- Operators enable open self-enrollment per tenant. Absent row means closed.
create table private.tenant_enrollment_policy (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  open_enrollment boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table private.tenant_enrollment_policy enable row level security;
revoke all on table private.tenant_enrollment_policy from public, anon, authenticated;
grant select, insert, update, delete on table private.tenant_enrollment_policy to service_role;

-- Slug lookup, not a shared-code UUID. Any other tenant stays closed until an operator adds a row.
create function private.apply_enrollment_policy() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.slug in ('back2kc','kcnow-concept') then
    insert into private.tenant_enrollment_policy(tenant_id, open_enrollment)
    values (new.id, new.slug = 'back2kc')
    on conflict (tenant_id) do update set open_enrollment = excluded.open_enrollment, updated_at = now();
  end if;
  return new;
end $$;
revoke all on function private.apply_enrollment_policy() from public, anon, authenticated;
create trigger apply_enrollment_policy after insert or update of slug on public.tenants
for each row execute function private.apply_enrollment_policy();
insert into private.tenant_enrollment_policy(tenant_id, open_enrollment)
select id, slug = 'back2kc' from public.tenants where slug in ('back2kc','kcnow-concept')
on conflict (tenant_id) do update set open_enrollment = excluded.open_enrollment, updated_at = now();

-- Raw invitation tokens are not stored. email is the invited account, lowercased.
create table private.tenant_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  -- Operator-defined. participant creates a path person; programs creates a program reviewer.
  -- member records tenant membership only. The client cannot choose this role.
  role text not null default 'member' check (role in ('member','participant','programs')),
  display_name text,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (role <> 'participant' or (display_name is not null and length(display_name) between 1 and 200))
);
create index tenant_invitations_tenant_idx on private.tenant_invitations(tenant_id);
alter table private.tenant_invitations enable row level security;
revoke all on table private.tenant_invitations from public, anon, authenticated;
grant select, insert, update, delete on table private.tenant_invitations to service_role;

-- invite_token is the only argument. A tenant or organization id is never accepted.
create function private.enroll_tenant(invite_token text default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); hinted uuid; account_email text; invite uuid; invite_role text; invite_name text; token text := nullif(btrim(invite_token), '');
begin
  select u.email into account_email from auth.users u where u.id = uid and u.email_confirmed_at is not null;
  if account_email is null then raise exception 'Confirmed sign-in required' using errcode = '42501'; end if;
  hinted := (
    select id from public.tenants
    where active and id::text = coalesce(nullif(current_setting('request.headers', true), '')::jsonb->>'x-tenant-id', '')
  );
  if hinted is null then raise exception 'Tenant context required' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('tenant-member:' || uid::text, 0));
  -- A supplied invitation can grant a new role to an existing member. Validate and
  -- consume it below; only token-free membership checks are an idempotent no-op.
  if token is null and exists(select 1 from public.tenant_members m where m.user_id = uid and m.tenant_id = hinted) then return hinted; end if;
  if token is not null then
    if length(token) < 16 or length(token) > 200 then raise exception 'Invitation not valid' using errcode = '42501'; end if;
    select i.id, i.role, i.display_name into invite, invite_role, invite_name from private.tenant_invitations i
    where i.token_hash = md5(token) and i.tenant_id = hinted and lower(i.email) = lower(account_email) and i.used_at is null and i.expires_at > now()
    for update;
    if invite is null then raise exception 'Invitation not valid' using errcode = '42501'; end if;
    update private.tenant_invitations set used_at = now(), used_by = uid where id = invite;
  elsif exists(select 1 from public.tenant_members m where m.user_id = uid) then
    raise exception 'Tenant membership required' using errcode = '42501';
  elsif not coalesce((select open_enrollment from private.tenant_enrollment_policy p where p.tenant_id = hinted), false) then
    raise exception 'Enrollment is closed' using errcode = '42501';
  end if;
  insert into public.tenant_members(tenant_id, user_id) values (hinted, uid) on conflict do nothing;
  if invite_role = 'participant' and not exists(select 1 from private.path_people p where p.tenant_id = hinted and p.user_id = uid) then
    insert into private.path_people(tenant_id, user_id, display_name) values (hinted, uid, invite_name);
  elsif invite_role = 'programs' and not exists(select 1 from private.workflow_reviewers w where w.tenant_id = hinted and w.user_id = uid and w.workflow = 'programs') then
    insert into private.workflow_reviewers(tenant_id, user_id, workflow) values (hinted, uid, 'programs');
  end if;
  return hinted;
end $$;
revoke all on function private.enroll_tenant(text) from public, anon, authenticated;
grant execute on function private.enroll_tenant(text) to authenticated;
create function public.enroll_tenant(invite_token text default null) returns uuid language sql security invoker set search_path='' as $$
  select private.enroll_tenant(invite_token)
$$;
revoke all on function public.enroll_tenant(text) from public, anon;
grant execute on function public.enroll_tenant(text) to authenticated;

create function private.record_tenant_membership() returns trigger
language plpgsql security definer set search_path='' as $$
declare subject uuid := new.user_id;
begin
  if subject is null or new.tenant_id is null then return new; end if;
  if tg_table_name not in ('user_roles', 'organization_members', 'workflow_reviewers', 'path_people') then return new; end if;
  insert into public.tenant_members(tenant_id, user_id) values (new.tenant_id, subject) on conflict do nothing;
  return new;
end $$;
revoke all on function private.record_tenant_membership() from public, anon, authenticated;

do $$ declare target text; begin
  foreach target in array array[
    'public.user_roles','public.organization_members','private.path_people','private.workflow_reviewers'
  ] loop
    execute format('create trigger tenant_membership after insert on %s for each row execute function private.record_tenant_membership()', target);
  end loop;
end $$;

-- Erasure of a workspace removes that tenant's membership and leaves every other tenant alone.
create or replace function private.path_erase(deletion_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare t uuid:=private.current_tenant(); u uuid; tab text; missing boolean; result jsonb; account_email text;
begin
  if not private.can_review('privacy') then raise exception 'Privacy scope required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(t::text, 0));
  select subject_id into u from private.path_deletion_requests where tenant_id=t and id=deletion_id and status='pending' for update;
  if u is null then raise exception 'Pending deletion required'; end if;
  if exists(select 1 from private.retention_holds where tenant_id=t and subject_id=u) then raise exception 'Retention decision required'; end if;
  lock table private.personal_data_inventory, private.program_profiles, private.program_catalog, private.program_records, private.program_events in share row exclusive mode;
  foreach tab in array array['program_profiles','program_catalog','program_records','program_events'] loop
    execute format('select exists(select 1 from private.%I r where tenant_id=$1 and not exists(select 1 from private.personal_data_inventory i where i.tenant_id=$1 and i.table_name=$2 and i.row_key=r.id::text))', tab) into missing using t, tab;
    if missing then raise exception 'Personal-data inventory incomplete: %', tab; end if;
  end loop;
  perform set_config('app.program_erasure','on', true);
  delete from private.program_events e where tenant_id=t and (subject_id=u or actor_id=u or exists(select 1 from private.personal_data_inventory i where i.tenant_id=t and i.table_name='program_events' and i.row_key=e.id::text and u=any(i.subjects)));
  delete from private.program_records r where tenant_id=t and (user_id=u or exists(select 1 from private.personal_data_inventory i where i.tenant_id=t and i.table_name='program_records' and i.row_key=r.id::text and u=any(i.subjects)));
  delete from private.program_profiles r where tenant_id=t and (user_id=u or exists(select 1 from private.personal_data_inventory i where i.tenant_id=t and i.table_name='program_profiles' and i.row_key=r.id::text and u=any(i.subjects)));
  update private.program_catalog r set title='[erased]', description='', category='', jurisdiction='', requirements='', process='', deadline=null, status='declined' where tenant_id=t and exists(select 1 from private.personal_data_inventory i where i.tenant_id=t and i.table_name='program_catalog' and i.row_key=r.id::text and u=any(i.subjects));
  delete from private.personal_data_inventory where tenant_id=t and table_name in ('program_profiles','program_catalog','program_records','program_events') and u=any(subjects);
  perform set_config('app.program_erasure','off', true);
  result := private.path_erase_core(deletion_id);
  -- Invitations are deleted, not retained. They store the invitee's email, and this
  -- workspace erasure is the personal-data deletion path. No separate invitation audit
  -- row is kept. Review notes for this person in this tenant are removed the same way.
  -- Other tenants are left unchanged. A future global Auth deletion must repeat this
  -- for every tenant; there is no second deletion function today.
  select email into account_email from auth.users where id = u;
  delete from public.tenant_members where tenant_id = t and user_id = u;
  delete from private.tenant_membership_review where tenant_id = t and user_id = u;
  delete from private.tenant_invitations
  where tenant_id = t and (used_by = u or (account_email is not null and lower(email) = lower(account_email)));
  return result;
end $$;

commit;
