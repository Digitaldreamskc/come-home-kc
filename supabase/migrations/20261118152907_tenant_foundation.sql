-- Local rehearsal required before applying anywhere hosted. Historical migrations remain intact.
begin;
create table public.tenants(id uuid primary key, slug text unique not null, name text not null, active boolean not null default true);
insert into public.tenants values ('b2000000-0000-4000-8000-000000000001','back2kc','Back2KC',true);
alter table public.tenants enable row level security;
grant select on public.tenants to anon,authenticated;
create policy tenant_public_identity on public.tenants for select using(active);
create function private.current_tenant() returns uuid language sql stable security invoker set search_path='' as $$
 select id from public.tenants where active and id::text =
 coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-tenant-id','')
$$;
revoke all on function private.current_tenant() from public;
grant usage on schema private to anon;
grant execute on function private.current_tenant() to anon,authenticated;

-- Existing data belongs to the original tenant. Future writes must carry explicit context.
do $$ declare t text; begin
 for t in select tablename from pg_tables where schemaname='public' and tablename<>'tenants' loop
  execute format('alter table public.%I add column tenant_id uuid not null default %L references public.tenants(id)',t,'b2000000-0000-4000-8000-000000000001');
  execute format('alter table public.%I alter column tenant_id set default private.current_tenant()',t);
  execute format('create index on public.%I(tenant_id)',t);
  execute format('alter table public.%I enable row level security',t);
  -- Restrictive policy combines with every existing owner/public/admin policy using AND.
  execute format('create policy tenant_boundary on public.%I as restrictive for all to anon,authenticated using (tenant_id = (select private.current_tenant())) with check (tenant_id = (select private.current_tenant()))',t);
 end loop;
end $$;

alter table public.user_roles drop constraint user_roles_pkey;
alter table public.user_roles add primary key(tenant_id,user_id);
alter table public.candidate_profiles drop constraint candidate_profiles_pkey;
alter table public.candidate_profiles add primary key(tenant_id,user_id);
alter table public.legacy_identity_map drop constraint legacy_identity_map_pkey;
alter table public.legacy_identity_map add primary key(tenant_id,source_program,collection,legacy_id);
alter table public.job_postings add column experience_level text not null default '';

-- Replace cross-domain foreign keys with tenant-paired references, not just application filters.
do $$ declare r record; child_cols text; parent_cols text; begin
 for r in select c.oid,c.conname,c.conrelid,c.confrelid,c.conkey,c.confkey,c.confdeltype from pg_constraint c
 join pg_class a on a.oid=c.conrelid join pg_namespace n on n.oid=a.relnamespace
 join pg_class b on b.oid=c.confrelid join pg_namespace m on m.oid=b.relnamespace
 where c.contype='f' and n.nspname='public' and m.nspname='public' and b.relname<>'tenants' loop
  select string_agg(quote_ident(attname),',' order by ord) into child_cols from unnest(r.conkey) with ordinality k(num,ord) join pg_attribute a on a.attrelid=r.conrelid and a.attnum=k.num;
  select string_agg(quote_ident(attname),',' order by ord) into parent_cols from unnest(r.confkey) with ordinality k(num,ord) join pg_attribute a on a.attrelid=r.confrelid and a.attnum=k.num;
  execute format('create unique index if not exists %I on %s(tenant_id,%s)','tenant_ref_'||r.oid,r.confrelid::regclass,parent_cols);
  execute format('alter table %s drop constraint %I',r.conrelid::regclass,r.conname);
  execute format('alter table %s add constraint %I foreign key(tenant_id,%s) references %s(tenant_id,%s) %s',r.conrelid::regclass,r.conname,child_cols,r.confrelid::regclass,parent_cols,case when r.confdeltype='c' then 'on delete cascade' else '' end);
 end loop;
end $$;

-- Natural import identities must not collide across independent organizations.
do $$ declare r record; cols text; begin
 for r in select c.* from pg_constraint c join pg_class a on a.oid=c.conrelid join pg_namespace n on n.oid=a.relnamespace where c.contype='u' and n.nspname='public' and a.relname<>'tenants' loop
  select string_agg(quote_ident(attname),',' order by ord) into cols from unnest(r.conkey) with ordinality k(num,ord) join pg_attribute a on a.attrelid=r.conrelid and a.attnum=k.num;
  execute format('alter table %s drop constraint %I',r.conrelid::regclass,r.conname);
  execute format('alter table %s add constraint %I unique(tenant_id,%s)',r.conrelid::regclass,r.conname,cols);
 end loop;
end $$;

create or replace function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.user_roles where tenant_id=private.current_tenant() and user_id=auth.uid() and role='admin')
$$;
create or replace function private.owns_organization(org uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.organization_members m join public.organizations o on o.id=m.organization_id and o.tenant_id=m.tenant_id where m.tenant_id=private.current_tenant() and m.organization_id=org and m.user_id=auth.uid() and m.verified_at is not null and o.verification_status='verified' and o.status<>'archived')
$$;

create or replace function private.record_change() returns trigger language plpgsql security definer set search_path='' as $$
 declare row_data jsonb; changed text[]; begin
 row_data:=case when TG_OP='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 select array_agg(key) into changed from jsonb_each(row_data) where TG_OP<>'UPDATE' or value is distinct from to_jsonb(old)->key;
 insert into public.audit_history(tenant_id,actor_id,table_name,record_id,operation,changed_fields) values((row_data->>'tenant_id')::uuid,auth.uid(),TG_TABLE_NAME,coalesce(row_data->>'id',row_data->>'user_id'),TG_OP,coalesce(changed,'{}'));
 return case when TG_OP='DELETE' then old else new end;end $$;

create or replace function private.record_profile_consent() returns trigger language plpgsql security definer set search_path='' as $$
 begin
 if TG_OP='INSERT' or old.opportunities_consent is distinct from new.opportunities_consent then
 insert into public.communications_consent(tenant_id,user_id,purpose,permitted,policy_version) values(new.tenant_id,new.user_id,'professional_opportunities',new.opportunities_consent,new.consent_version);end if;
 if TG_OP='INSERT' or old.introductions_consent is distinct from new.introductions_consent then
 insert into public.communications_consent(tenant_id,user_id,purpose,permitted,policy_version) values(new.tenant_id,new.user_id,'employer_introductions',new.introductions_consent,new.consent_version);end if;return new;end $$;

-- Adapt the existing validated definer intake without losing its validation and deduplication.
do $$ declare definition text; begin
 definition:=pg_get_functiondef('private.submit_intake(text,jsonb)'::regprocedure);
 definition:=replace(definition,'uid:=auth.uid();','if private.current_tenant() is null then raise exception ''Tenant context required'';end if; uid:=auth.uid();');
 definition:=replace(definition,'''intake:''||uid::text','''intake:''||private.current_tenant()::text||'':''||uid::text');
 definition:=replace(definition,'key:=uid::text','key:=private.current_tenant()::text||'':''||uid::text');
 definition:=replace(definition,'where dedupe_key=key','where tenant_id=private.current_tenant() and dedupe_key=key');
 execute definition;
end $$;

-- Tenant identity is immutable even to administrators; rehoming needs a reviewed migration.
create function private.guard_tenant() returns trigger language plpgsql set search_path='' as $$ begin
 if new.tenant_id is distinct from old.tenant_id then raise exception 'Tenant ownership cannot change';end if;return new;end $$;
revoke all on function private.guard_tenant() from public;
do $$ declare t text; begin
 for t in select tablename from pg_tables where schemaname='public' and tablename<>'tenants' loop
 execute format('create trigger immutable_tenant before update on public.%I for each row execute function private.guard_tenant()',t);
 end loop;end $$;

-- Geography is configured per tenant. Keep headquarters independent from work eligibility.
create table public.tenant_regions(tenant_id uuid not null references public.tenants(id),code text not null,label text not null,primary key(tenant_id,code));
insert into public.tenant_regions values('b2000000-0000-4000-8000-000000000001','MO','Missouri'),('b2000000-0000-4000-8000-000000000001','KS','Kansas');
alter table public.tenant_regions enable row level security;
grant select on public.tenant_regions to anon,authenticated;
create policy region_read on public.tenant_regions for select using(tenant_id=private.current_tenant());
do $$ declare r record; begin
 for r in select c.conname,c.conrelid from pg_constraint c join pg_class a on a.oid=c.conrelid join pg_namespace n on n.oid=a.relnamespace
 where c.contype='c' and n.nspname='public' and pg_get_constraintdef(c.oid) like '%MO%' and pg_get_constraintdef(c.oid) like '%KS%' loop
 execute format('alter table %s drop constraint %I',r.conrelid::regclass,r.conname);end loop;end $$;
alter table public.organization_locations add foreign key(tenant_id,state) references public.tenant_regions(tenant_id,code);
alter table public.job_locations add foreign key(tenant_id,state) references public.tenant_regions(tenant_id,code);
alter table public.resource_eligibility add foreign key(tenant_id,state) references public.tenant_regions(tenant_id,code);
create function private.validate_regions() returns trigger language plpgsql set search_path='' as $$
 declare codes text[]; begin
 codes:=case TG_TABLE_NAME when 'job_postings' then new.remote_eligible_states when 'candidate_profiles' then new.preferred_states else new.eligible_states end;
 if exists(select 1 from unnest(codes) c where not exists(select 1 from public.tenant_regions r where r.tenant_id=new.tenant_id and r.code=c)) then raise exception 'Region outside tenant coverage';end if;return new;end $$;
revoke all on function private.validate_regions() from public;
create trigger tenant_regions_valid before insert or update on public.job_postings for each row execute function private.validate_regions();
create trigger tenant_regions_valid before insert or update on public.candidate_profiles for each row execute function private.validate_regions();
create trigger tenant_regions_valid before insert or update on public.events for each row execute function private.validate_regions();
commit;
