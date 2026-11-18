-- Come Home KC isolated development schema. No existing Social Balances schema is modified.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.user_roles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('admin')),
 created_at timestamptz not null default now()
);
alter table public.user_roles enable row level security;
create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin')
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;
create function public.user_is_admin() returns boolean language sql stable security invoker set search_path='' as $$ select private.is_admin() $$;
revoke all on function public.user_is_admin() from public;
grant execute on function public.user_is_admin() to authenticated;
create policy roles_own on public.user_roles for select to authenticated using(user_id=(select auth.uid()));
-- Roles are provisioned only by the database operator. No client grant or mutation policy.
grant select on public.user_roles to authenticated;

create table public.organizations (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 200),
 description text not null default '',website text check(website is null or website ~ '^https://'),industry text not null default '',
 headquarters_state text check(headquarters_state in ('MO','KS')),status text not null default 'draft' check(status in ('draft','published','archived')),
 verification_status text not null default 'research' check(verification_status in ('research','pending','verified')),
 verified_at timestamptz,source_url text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(verification_status<>'verified' or verified_at is not null)
);
create table public.organization_locations (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,
 city text not null,state text not null check(state in ('MO','KS')),verified_at timestamptz,source_url text,
 unique(organization_id,city,state)
);
create table public.organization_members (
 organization_id uuid not null references public.organizations(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,
 verified_at timestamptz,created_at timestamptz not null default now(),primary key(organization_id,user_id)
);
create function private.owns_organization(org uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.organization_members m join public.organizations o on o.id=m.organization_id where m.organization_id=org and m.user_id=auth.uid() and m.verified_at is not null and o.verification_status='verified' and o.status<>'archived')
$$;
revoke all on function private.owns_organization(uuid) from public;
grant execute on function private.owns_organization(uuid) to authenticated;

create table public.job_postings (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),
 title text not null check(length(title) between 1 and 200),description text not null default '',industry text not null default '',
 work_mode text not null default 'onsite' check(work_mode in ('onsite','hybrid','remote')),employment_type text not null default '',salary_range text,
 application_url text check(application_url is null or application_url ~ '^https://'),application_instructions text not null default '',
 status text not null default 'pending' check(status in ('pending','active','closed','archived')),verified_at timestamptz,expires_at timestamptz,
 remote_eligible_states text[] not null default '{}' check(remote_eligible_states <@ array['MO','KS']::text[]),
 created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(status<>'active' or (verified_at is not null and expires_at is not null and application_url is not null and length(description)>0))
);
create table public.job_locations (
 id uuid primary key default gen_random_uuid(),job_id uuid not null references public.job_postings(id) on delete cascade,
 city text not null,state text not null check(state in ('MO','KS')),verified_at timestamptz,source_url text,unique(job_id,city,state)
);
create table public.resources (
 id uuid primary key default gen_random_uuid(),title text not null check(length(title) between 1 and 200),description text not null default '',category text not null default '',
 url text not null check(url ~ '^https://'),contact_url text,status text not null default 'draft' check(status in ('draft','published','archived')),
 verified_at timestamptz,source_url text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(status<>'published' or verified_at is not null)
);
create table public.resource_eligibility (
 id uuid primary key default gen_random_uuid(),resource_id uuid not null references public.resources(id) on delete cascade,
 state text not null check(state in ('MO','KS')),notes text not null default '',verified_at timestamptz,unique(resource_id,state)
);
create table public.events (
 id uuid primary key default gen_random_uuid(),title text not null,description text not null default '',starts_at timestamptz not null,
 location text not null,state text check(state in ('MO','KS')),eligible_states text[] not null default '{}' check(eligible_states <@ array['MO','KS']::text[]),
 audience text not null default '',registration_url text not null check(registration_url ~ '^https://'),capacity integer check(capacity>0),
 host_organization_id uuid references public.organizations(id),status text not null default 'draft' check(status in ('draft','published','archived')),
 verified_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(status<>'published' or verified_at is not null)
);
create table public.event_organizations(event_id uuid references public.events(id) on delete cascade,organization_id uuid references public.organizations(id),primary key(event_id,organization_id));
create table public.event_resources(event_id uuid references public.events(id) on delete cascade,resource_id uuid references public.resources(id),primary key(event_id,resource_id));

create table public.candidate_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,name text not null default '',email text not null,
 current_city text not null default '',current_state text not null default '',preferred_states text[] not null default '{}' check(preferred_states <@ array['MO','KS']::text[]),
 industry_interests text[] not null default '{}',skills text[] not null default '{}',target_roles text[] not null default '{}',
 employment_preference text not null default '',work_preference text not null default '',relocation_timeline text not null default '',portfolio_url text,
 opportunities_consent boolean not null default false,introductions_consent boolean not null default false,consent_version text not null default '2026-11-17',
 updated_at timestamptz not null default now(),created_at timestamptz not null default now()
);
create table public.communications_consent (
 id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete cascade,
 purpose text not null check(purpose in ('community_updates','mixer_invitations','professional_opportunities','employer_introductions','spotlight')),
 permitted boolean not null,policy_version text not null,recorded_at timestamptz not null default now(),source text not null default 'account'
);
create table public.submissions (
 id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('employer','candidate','resource','job','partnership','mixer','deletion','profile_change')),
 user_id uuid references auth.users(id) on delete set null,organization_id uuid references public.organizations(id),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=50000),
 status text not null default 'pending' check(status in ('pending','approved','rejected','archived')),review_note text not null default '',
 reviewed_by uuid references auth.users(id) on delete set null,reviewed_at timestamptz,created_at timestamptz not null default now(),
 dedupe_key text unique
);
create table public.employer_conversations (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),
 contact text not null default '',relationship_kind text not null default '',status text not null default 'Prospect',notes text not null default '',
 next_action text not null default '',owner text not null default '',due_date date,source_url text,source_record jsonb not null default '{}',
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.job_needs (
 id uuid primary key default gen_random_uuid(),organization_id uuid references public.organizations(id),title text not null,
 details text not null default '',status text not null default 'open' check(status in ('open','paused','closed','archived')),source_record jsonb not null default '{}',
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.introduction_requests (
 id uuid primary key default gen_random_uuid(),candidate_user_id uuid not null references auth.users(id) on delete cascade,
 job_id uuid not null references public.job_postings(id),message text not null default '',status text not null default 'requested' check(status in ('requested','reviewing','approved','declined','closed')),
 created_at timestamptz not null default now(),unique(candidate_user_id,job_id)
);
create table public.introductions (
 id uuid primary key default gen_random_uuid(),request_id uuid references public.introduction_requests(id),candidate_user_id uuid references auth.users(id) on delete cascade,
 organization_id uuid references public.organizations(id),rationale text not null default '',sharing_scope text not null default '',
 candidate_approved_at timestamptz,employer_approved_at timestamptz,permission_evidence text not null default '',introduced_at timestamptz,
 status text not null default 'proposed' check(status in ('proposed','approved','introduced','meeting','closed')),next_action text not null default '',
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(introduced_at is null or (candidate_approved_at is not null and employer_approved_at is not null and length(sharing_scope)>0 and length(permission_evidence)>0))
);
create table public.tasks (
 id uuid primary key default gen_random_uuid(),action text not null,owner text not null default '',due_date date,
 status text not null default 'Open' check(status in ('Open','Done','Cancelled')),notes text not null default '',source_record jsonb not null default '{}',
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.outcomes (
 id uuid primary key default gen_random_uuid(),introduction_id uuid references public.introductions(id),type text not null,occurred_on date,
 verification text not null default 'Reported' check(verification in ('Reported','Confirmed')),source text not null default '',details text not null default '',
 public_approved boolean not null default false,created_at timestamptz not null default now(),check(verification<>'Confirmed' or (occurred_on is not null and length(source)>0))
);
create table public.evidence_sources (
 id uuid primary key default gen_random_uuid(),record_type text not null,record_id uuid,source_url text,notes text not null default '',checked_at timestamptz
);
create table public.import_batches (
 id uuid primary key default gen_random_uuid(),source_name text not null,fingerprint text not null unique,source_data jsonb not null,report jsonb not null default '{}',
 imported_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now()
);
create table public.import_records (
 id uuid primary key default gen_random_uuid(),batch_id uuid not null references public.import_batches(id),collection text not null,legacy_id text not null,
 original_record jsonb not null,target_id uuid,disposition text not null check(disposition in ('imported','duplicate','review','failed')),
 reason text not null default '',unique(batch_id,collection,legacy_id)
);
create table public.legacy_identity_map (
 source_program text not null,collection text not null,legacy_id text not null,target_id uuid not null,original_record jsonb not null,
 primary key(source_program,collection,legacy_id)
);
create table public.audit_history (
 id bigint generated always as identity primary key,actor_id uuid,table_name text not null,record_id text,operation text not null,
 changed_fields text[] not null default '{}',occurred_at timestamptz not null default now()
);
-- Audit contains identifiers and changed field names, never a second copy of candidate data.
create function private.record_change() returns trigger language plpgsql security definer set search_path='' as $$
 declare row_data jsonb; changed text[];
 begin
 row_data:=case when TG_OP='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 select array_agg(key) into changed from jsonb_each(row_data) where TG_OP<>'UPDATE' or value is distinct from to_jsonb(old)->key;
 insert into public.audit_history(actor_id,table_name,record_id,operation,changed_fields) values(auth.uid(),TG_TABLE_NAME,coalesce(row_data->>'id',row_data->>'user_id'),TG_OP,coalesce(changed,'{}'));
 return case when TG_OP='DELETE' then old else new end;
 end $$;
revoke all on function private.record_change() from public;
create function private.touch_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now();return new;end $$;
revoke all on function private.touch_updated_at() from public;

-- Apply RLS to every exposed table; admin access is explicit, never user_metadata.
do $$ declare t text; begin
 foreach t in array array['organizations','organization_locations','organization_members','job_postings','job_locations','resources','resource_eligibility','events','event_organizations','event_resources','candidate_profiles','communications_consent','submissions','employer_conversations','job_needs','introduction_requests','introductions','tasks','outcomes','evidence_sources','import_batches','import_records','legacy_identity_map','audit_history'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy admin_all on public.%I for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))',t);
 execute format('grant select, insert, update, delete on public.%I to authenticated',t);
 if t<>'audit_history' then execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function private.record_change()',t);end if;
 end loop;
 foreach t in array array['organizations','job_postings','resources','events','candidate_profiles','employer_conversations','job_needs','introductions','tasks'] loop
 execute format('create trigger touch_updated before update on public.%I for each row execute function private.touch_updated_at()',t);
 end loop;
end $$;
-- Immutable audit/import history for application users, including administrators.
drop policy admin_all on public.audit_history;
create policy audit_admin_read on public.audit_history for select to authenticated using((select private.is_admin()));
revoke insert,update,delete on public.audit_history from authenticated;

create policy org_public on public.organizations for select to anon,authenticated using(status='published');
create policy locations_public on public.organization_locations for select to anon,authenticated using(verified_at is not null and exists(select 1 from public.organizations where id=organization_id and status='published'));
create policy membership_own on public.organization_members for select to authenticated using(user_id=(select auth.uid()));
create policy jobs_public on public.job_postings for select to anon,authenticated using(status='active' and verified_at is not null and expires_at>now() and exists(select 1 from public.organizations where id=organization_id and status='published' and verification_status='verified'));
create policy jobs_employer on public.job_postings for select to authenticated using(private.owns_organization(organization_id));
create policy jobs_employer_insert on public.job_postings for insert to authenticated with check(private.owns_organization(organization_id) and status='pending' and verified_at is null and created_by=(select auth.uid()));
create policy jobs_employer_update on public.job_postings for update to authenticated using(private.owns_organization(organization_id)) with check(private.owns_organization(organization_id) and status in ('pending','closed') and verified_at is null);
create policy job_locations_public on public.job_locations for select to anon,authenticated using(verified_at is not null and exists(select 1 from public.job_postings where id=job_id and status='active' and verified_at is not null and expires_at>now()));
create policy resources_public on public.resources for select to anon,authenticated using(status='published' and verified_at is not null);
create policy eligibility_public on public.resource_eligibility for select to anon,authenticated using(verified_at is not null and exists(select 1 from public.resources where id=resource_id and status='published' and verified_at is not null));
create policy events_public on public.events for select to anon,authenticated using(status='published' and verified_at is not null);
create policy event_orgs_public on public.event_organizations for select to anon,authenticated using(exists(select 1 from public.events where id=event_id and status='published' and verified_at is not null));
create policy event_resources_public on public.event_resources for select to anon,authenticated using(exists(select 1 from public.events where id=event_id and status='published' and verified_at is not null));
create policy profile_own on public.candidate_profiles for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy consent_own_read on public.communications_consent for select to authenticated using(user_id=(select auth.uid()));
create policy consent_own_insert on public.communications_consent for insert to authenticated with check(user_id=(select auth.uid()));
create policy submission_own_read on public.submissions for select to authenticated using(user_id=(select auth.uid()));
-- Submissions only enter via validated/rate-limited server paths; there is no anonymous or client INSERT policy.
create policy request_own_read on public.introduction_requests for select to authenticated using(candidate_user_id=(select auth.uid()));
create policy request_own_insert on public.introduction_requests for insert to authenticated with check(candidate_user_id=(select auth.uid()) and status='requested' and exists(select 1 from public.job_postings where id=job_id and status='active' and verified_at is not null and expires_at>now()));
create policy intro_own_read on public.introductions for select to authenticated using(candidate_user_id=(select auth.uid()));
grant select on public.organizations,public.organization_locations,public.job_postings,public.job_locations,public.resources,public.resource_eligibility,public.events,public.event_organizations,public.event_resources to anon;
grant all on all tables in schema public to service_role;
grant usage,select on all sequences in schema public to service_role;

-- Editing an employer-owned listing returns it to review; approval belongs to admins.
create function private.guard_job_edit() returns trigger language plpgsql security definer set search_path='' as $$
 begin
 if auth.uid() is not null and not private.is_admin() then
 if TG_OP='UPDATE' and new.organization_id<>old.organization_id then raise exception 'Organization cannot be changed';end if;
 if not private.owns_organization(new.organization_id) then raise exception 'Verified organization membership required';end if;
 new.verified_at=null;
 if new.status<>'closed' then new.status='pending';end if;
 new.created_by=auth.uid();
 end if;return new;end $$;
revoke all on function private.guard_job_edit() from public;
create trigger guard_job_edit before insert or update on public.job_postings for each row execute function private.guard_job_edit();

-- Durable rate limit: application server uses a keyed hash, never a raw IP/email.
create table private.rate_limits(key text primary key,window_start timestamptz not null,count integer not null);
alter table private.rate_limits enable row level security;
create function public.consume_rate_limit(bucket text,max_requests integer default 5,window_seconds integer default 3600) returns boolean language plpgsql security definer set search_path='' as $$
 declare v_count integer;
 begin
 if length(bucket)<16 or max_requests<1 or max_requests>100 or window_seconds<1 then raise exception 'Invalid rate limit';end if;
 insert into private.rate_limits as r(key,window_start,count) values(bucket,now(),1)
 on conflict(key) do update set window_start=case when r.window_start<now()-make_interval(secs=>window_seconds) then now() else r.window_start end,
 count=case when r.window_start<now()-make_interval(secs=>window_seconds) then 1 else r.count+1 end returning count into v_count;
 return v_count<=max_requests;
 end $$;
revoke all on function public.consume_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,integer,integer) to service_role;

create index jobs_organization_idx on public.job_postings(organization_id);
create index jobs_active_idx on public.job_postings(status,expires_at);
create index locations_state_idx on public.organization_locations(state,organization_id);
create index jobs_locations_state_idx on public.job_locations(state,job_id);
create index resources_state_idx on public.resource_eligibility(state,resource_id);
create index submissions_status_idx on public.submissions(status,created_at);
create index conversations_organization_idx on public.employer_conversations(organization_id);
create index members_user_idx on public.organization_members(user_id);
create index requests_candidate_idx on public.introduction_requests(candidate_user_id);
create index intros_candidate_idx on public.introductions(candidate_user_id);
create index consent_user_idx on public.communications_consent(user_id);
commit;
-- Run after schema.sql. Immutable source snapshots and no overwrite of existing records.
begin;
create function public.import_legacy(source_data jsonb,source_name text default 'Come Home browser export') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
 fingerprint text; batch uuid; prior uuid; program text; collection text; item jsonb; legacy text; target uuid; existing jsonb;
 n integer:=0; imported integer:=0; duplicates integer:=0; review integer:=0; missing integer:=0; org_count integer:=0; conversation_count integer:=0; result jsonb;
begin
 if current_user not in ('postgres','service_role') and not private.is_admin() then raise exception 'Administrator required';end if;
 if jsonb_typeof(source_data)<>'object' or source_data->>'schema_version'<>'1.0.0' or source_data->>'program_id'<>'back2kc-come-home' then raise exception 'Unsupported backup format';end if;
 if octet_length(source_data::text)>5000000 then raise exception 'Backup exceeds 5 MB';end if;
 foreach collection in array array['employers','candidates','demands','matches','outcomes','tasks'] loop
 if jsonb_typeof(source_data->collection)<>'array' then raise exception 'Missing collection %',collection;end if;
 if exists(select 1 from jsonb_array_elements(source_data->collection) x where jsonb_typeof(x)<>'object' or coalesce(x->>'id','')='') then raise exception 'Each % record requires an id',collection;end if;
 if exists(select 1 from jsonb_array_elements(source_data->collection) x group by x->>'id' having count(*)>1) then raise exception 'Duplicate IDs in %; backup unchanged',collection;end if;
 end loop;
 fingerprint:=md5(source_data::text);program:=source_data->>'program_id';
 select id into prior from public.import_batches where import_batches.fingerprint=import_legacy.fingerprint;
 if prior is not null then return jsonb_build_object('batch_id',prior,'replayed',true,'report',(select report from public.import_batches where id=prior));end if;
 -- Serialize concurrent imports of this program to make identity mapping deterministic.
 perform pg_advisory_xact_lock(hashtext(program));
 select id into prior from public.import_batches where import_batches.fingerprint=import_legacy.fingerprint;
 if prior is not null then return jsonb_build_object('batch_id',prior,'replayed',true,'report',(select report from public.import_batches where id=prior));end if;
 insert into public.import_batches(source_name,fingerprint,source_data,imported_by) values(source_name,fingerprint,source_data,auth.uid()) returning id into batch;
 foreach collection in array array['employers','candidates','demands','matches','outcomes','tasks'] loop
 for item in select value from jsonb_array_elements(source_data->collection) loop
 n:=n+1;legacy:=item->>'id';target:=null;existing:=null;
 select target_id,original_record into target,existing from public.legacy_identity_map m where m.source_program=program and m.collection=import_legacy.collection and m.legacy_id=legacy;
 if target is not null then
 if existing=item then duplicates:=duplicates+1;insert into public.import_records(batch_id,collection,legacy_id,original_record,target_id,disposition,reason) values(batch,collection,legacy,item,target,'duplicate','Existing identity retained; no update.');
 else review:=review+1;insert into public.import_records(batch_id,collection,legacy_id,original_record,target_id,disposition,reason) values(batch,collection,legacy,item,target,'review','Existing identity has different data. Both source versions retained; administrator must reconcile.');end if;
 elsif collection='employers' and coalesce(item->>'name','')<>'' then
 insert into public.organizations(name,status,verification_status) values(item->>'name','draft','research') returning id into target;
 org_count:=org_count+1;
 insert into public.employer_conversations(organization_id,contact,relationship_kind,status,notes,next_action,owner,due_date,source_url,source_record)
 values(target,coalesce(item->>'contact',''),coalesce(item->>'kind',''),coalesce(item->>'status','Prospect'),coalesce(item->>'source_note',''),coalesce(item->>'next_action',''),coalesce(item->>'owner',''),null, item->>'source_url',item);
 conversation_count:=conversation_count+1;imported:=imported+1;
 -- Due dates and all unmodeled fields remain in source_record for review; no inferred current geography or hiring commitment.
 if coalesce(item->>'hiring_contact','')='' then missing:=missing+1;end if;
 insert into public.legacy_identity_map values(program,collection,legacy,target,item);
 insert into public.import_records(batch_id,collection,legacy_id,original_record,target_id,disposition,reason) values(batch,collection,legacy,item,target,'imported','Research organization and private conversation preserved; publication and geography require review.');
 elsif collection='tasks' and coalesce(item->>'action','')<>'' then
 insert into public.tasks(action,owner,status,notes,source_record) values(item->>'action',coalesce(item->>'owner',''),case when item->>'status' in ('Open','Done','Cancelled') then item->>'status' else 'Open' end,coalesce(item->>'notes',''),item) returning id into target;
 imported:=imported+1;insert into public.legacy_identity_map values(program,collection,legacy,target,item);
 insert into public.import_records(batch_id,collection,legacy_id,original_record,target_id,disposition,reason) values(batch,collection,legacy,item,target,'imported','Task preserved; source due date retained for date review.');
 else
 review:=review+1;insert into public.import_records(batch_id,collection,legacy_id,original_record,disposition,reason) values(batch,collection,legacy,item,'review','Preserved in review queue. Identity, permissions and field mapping require review before activation.');
 end if;
 end loop;
 end loop;
 result:=jsonb_build_object('original_records',n,'imported_records',imported,'duplicates',duplicates,'requires_review',review,'missing_information',missing,'failed_imports',0,'organizations_created',org_count,'conversations_created',conversation_count,'all_source_records_preserved',n=(imported+duplicates+review));
 update public.import_batches set report=result where id=batch;
 return jsonb_build_object('batch_id',batch,'replayed',false,'report',result);
end $$;
revoke all on function public.import_legacy(jsonb,text) from public,anon;
grant execute on function public.import_legacy(jsonb,text) to authenticated,service_role;
commit;
begin;
create function private.submit_intake(p_kind text,p_payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
 declare uid uuid; email text; item uuid; key text;
 begin
 uid:=auth.uid();if uid is null then raise exception 'Sign in required';end if;
 select u.email into email from auth.users u where u.id=uid and u.email_confirmed_at is not null;
 if email is null then raise exception 'Confirmed email required';end if;
 if p_kind not in ('employer','candidate','resource','job','partnership','mixer','deletion','profile_change') then raise exception 'Unsupported request';end if;
 if jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>30000 or coalesce(p_payload->>'name','')='' or length(p_payload->>'name')>200 then raise exception 'Valid name and request required';end if;
 if coalesce(p_payload->>'website_trap','')<>'' then raise exception 'Request rejected';end if;
 if not public.consume_rate_limit('intake:'||uid::text,10,3600) then raise exception 'Please try again later';end if;
 p_payload:=p_payload||jsonb_build_object('email',email,'consent_recorded_at',now(),'policy_version','2026-11-17');
 key:=uid::text||':'||p_kind||':'||md5((p_payload-'consent_recorded_at')::text);
 select id into item from public.submissions where dedupe_key=key;
 if item is not null then return item;end if;
 insert into public.submissions(kind,user_id,payload,dedupe_key) values(p_kind,uid,p_payload,key) returning id into item;
 return item;
 end $$;
-- md5 requires text, explicitly canonicalized JSON.
revoke all on function private.submit_intake(text,jsonb) from public;
grant execute on function private.submit_intake(text,jsonb) to authenticated;
create function public.submit_intake(p_kind text,p_payload jsonb) returns uuid language sql security invoker set search_path='' as $$ select private.submit_intake(p_kind,p_payload) $$;
revoke all on function public.submit_intake(text,jsonb) from public,anon;
grant execute on function public.submit_intake(text,jsonb) to authenticated;

create function private.record_profile_consent() returns trigger language plpgsql security definer set search_path='' as $$
 begin
 if TG_OP='INSERT' or old.opportunities_consent is distinct from new.opportunities_consent then
 insert into public.communications_consent(user_id,purpose,permitted,policy_version) values(new.user_id,'professional_opportunities',new.opportunities_consent,new.consent_version);
 end if;
 if TG_OP='INSERT' or old.introductions_consent is distinct from new.introductions_consent then
 insert into public.communications_consent(user_id,purpose,permitted,policy_version) values(new.user_id,'employer_introductions',new.introductions_consent,new.consent_version);
 end if;return new;
 end $$;
revoke all on function private.record_profile_consent() from public;
create trigger profile_consent after insert or update on public.candidate_profiles for each row execute function private.record_profile_consent();
commit;
