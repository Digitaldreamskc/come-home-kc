-- Tenant authority is a membership row for auth.uid(). The x-tenant-id header only
-- selects among those memberships. Historical migrations stay unchanged.
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

-- People already connected to a tenant keep that authority. Clients cannot insert these rows.
insert into public.tenant_members(tenant_id, user_id)
select tenant_id, user_id from public.user_roles
union
select tenant_id, user_id from public.candidate_profiles
union
select tenant_id, user_id from public.organization_members
union
select tenant_id, user_id from public.submissions where user_id is not null
union
select tenant_id, candidate_user_id from public.introduction_requests
union
select tenant_id, user_id from public.communications_consent where user_id is not null
union
select tenant_id, user_id from private.path_people where user_id is not null
union
select tenant_id, user_id from private.program_profiles
union
select tenant_id, user_id from private.workflow_reviewers
on conflict do nothing;

-- Anonymous catalog reads still follow the deployment header. Authenticated calls
-- follow it only when it matches a membership. An account with no membership yet
-- may be bound by its first self-service write; the trigger below records that row.
create or replace function private.current_tenant() returns uuid
language sql stable security definer set search_path='' as $$
  select t.id from public.tenants t
  where t.active
    and t.id::text = coalesce(nullif(current_setting('request.headers', true), '')::jsonb->>'x-tenant-id', '')
    and (
      auth.uid() is null
      or exists (select 1 from public.tenant_members m where m.tenant_id = t.id and m.user_id = auth.uid())
      or not exists (select 1 from public.tenant_members m where m.user_id = auth.uid())
    )
$$;
revoke all on function private.current_tenant() from public;
grant execute on function private.current_tenant() to anon, authenticated;

create function private.record_tenant_membership() returns trigger
language plpgsql security definer set search_path='' as $$
declare subject uuid := new.user_id; claim text;
begin
  if subject is null or new.tenant_id is null then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended('tenant-member:' || subject::text, 0));
  claim := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role'
  );
  -- A signed-in person cannot acquire a second tenant by writing. Operators and
  -- service-role grants are not self-service and may add another membership.
  if claim = 'authenticated' and auth.uid() is not distinct from subject
     and exists (select 1 from public.tenant_members m where m.user_id = subject and m.tenant_id <> new.tenant_id)
     and not exists (select 1 from public.tenant_members m where m.user_id = subject and m.tenant_id = new.tenant_id)
  then
    raise exception 'Tenant membership required' using errcode = '42501';
  end if;
  insert into public.tenant_members(tenant_id, user_id) values (new.tenant_id, subject) on conflict do nothing;
  return new;
end $$;
revoke all on function private.record_tenant_membership() from public, anon, authenticated;

do $$ declare target text; begin
  foreach target in array array[
    'public.candidate_profiles','public.user_roles','public.organization_members','public.submissions',
    'private.path_people','private.program_profiles','private.workflow_reviewers'
  ] loop
    execute format('create trigger tenant_membership after insert on %s for each row execute function private.record_tenant_membership()', target);
  end loop;
end $$;

commit;
