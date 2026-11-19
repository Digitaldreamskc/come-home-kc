-- Tenant authority is a membership row for auth.uid(). The x-tenant-id header only
-- selects among memberships that already exist. Historical migrations stay unchanged.
--
-- Backfill rule: grant membership only from operator evidence (user_roles,
-- organization_members, workflow_reviewers, and path_people, which clients cannot
-- insert). Signup does not record a tenant. When that evidence is absent and every
-- self-service record (profile, submission, introduction request, consent, program
-- profile) is in one tenant, that tenant is the account's original workspace and is
-- granted. Records in more than one tenant, or in a tenant without a grant, are not
-- turned into memberships; they are listed in private.tenant_membership_review and
-- announced with a migration NOTICE for an operator to reconcile.
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

  -- No server-side signup tenant was stored. One self-service workspace is the original.
  insert into public.tenant_members(tenant_id, user_id)
  select (array_agg(distinct activity.tenant_id))[1], activity.user_id
  from (
    select tenant_id, user_id from public.candidate_profiles
    union
    select tenant_id, user_id from public.submissions where user_id is not null
    union
    select tenant_id, candidate_user_id as user_id from public.introduction_requests
    union
    select tenant_id, user_id from public.communications_consent where user_id is not null
    union
    select tenant_id, user_id from private.program_profiles
  ) activity
  where not exists (select 1 from public.tenant_members m where m.user_id = activity.user_id)
  group by activity.user_id
  having count(distinct activity.tenant_id) = 1
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

-- The only self-service enrollment. It records exactly one tenant, taken from the
-- active header, and only when the account has none. Later calls succeed only when
-- the header matches a membership. Introduction requests and other writes do not enroll.
create function private.enroll_tenant() returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); hinted uuid;
begin
  if uid is null or not exists(select 1 from auth.users u where u.id = uid and u.email_confirmed_at is not null) then
    raise exception 'Confirmed sign-in required' using errcode = '42501';
  end if;
  hinted := (
    select id from public.tenants
    where active and id::text = coalesce(nullif(current_setting('request.headers', true), '')::jsonb->>'x-tenant-id', '')
  );
  if hinted is null then raise exception 'Tenant context required' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('tenant-member:' || uid::text, 0));
  if exists(select 1 from public.tenant_members m where m.user_id = uid and m.tenant_id = hinted) then return hinted; end if;
  if exists(select 1 from public.tenant_members m where m.user_id = uid) then
    raise exception 'Tenant membership required' using errcode = '42501';
  end if;
  insert into public.tenant_members(tenant_id, user_id) values (hinted, uid);
  return hinted;
end $$;
revoke all on function private.enroll_tenant() from public, anon, authenticated;
grant execute on function private.enroll_tenant() to authenticated;
create function public.enroll_tenant() returns uuid language sql security invoker set search_path='' as $$
  select private.enroll_tenant()
$$;
revoke all on function public.enroll_tenant() from public, anon;
grant execute on function public.enroll_tenant() to authenticated;

create function private.record_tenant_membership() returns trigger
language plpgsql security definer set search_path='' as $$
declare subject uuid := new.user_id; claim text;
begin
  if subject is null or new.tenant_id is null then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended('tenant-member:' || subject::text, 0));
  -- Operator evidence grants the tenant. A profile does not grant a second one.
  if tg_table_name in ('user_roles', 'organization_members', 'workflow_reviewers', 'path_people') then
    insert into public.tenant_members(tenant_id, user_id) values (new.tenant_id, subject) on conflict do nothing;
    return new;
  end if;
  if exists(select 1 from public.tenant_members m where m.user_id = subject and m.tenant_id = new.tenant_id) then return new; end if;
  if exists(select 1 from public.tenant_members m where m.user_id = subject) then
    claim := coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role');
    if claim = 'authenticated' and auth.uid() is not distinct from subject then
      raise exception 'Tenant membership required' using errcode = '42501';
    end if;
    return new;
  end if;
  insert into public.tenant_members(tenant_id, user_id) values (new.tenant_id, subject);
  return new;
end $$;
revoke all on function private.record_tenant_membership() from public, anon, authenticated;

do $$ declare target text; begin
  foreach target in array array[
    'public.candidate_profiles','public.user_roles','public.organization_members',
    'private.path_people','private.workflow_reviewers'
  ] loop
    execute format('create trigger tenant_membership after insert on %s for each row execute function private.record_tenant_membership()', target);
  end loop;
end $$;

-- Erasure of a workspace removes that tenant's membership and leaves every other tenant alone.
create or replace function private.path_erase(deletion_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare t uuid:=private.current_tenant(); u uuid; tab text; missing boolean; result jsonb;
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
  delete from public.tenant_members where tenant_id=t and user_id=u;
  return result;
end $$;

commit;
