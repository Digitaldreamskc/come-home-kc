begin;
-- Domain extensions reuse Auth, organization membership, workflow reviewers and paths.
alter table private.workflow_reviewers drop constraint workflow_reviewers_workflow_check;
alter table private.workflow_reviewers add constraint workflow_reviewers_workflow_check check(workflow in ('introductions','privacy','profiles','programs','showcase'));
create table private.program_modules(tenant_id uuid primary key references public.tenants(id),enabled boolean not null default false);
create table private.program_profiles(tenant_id uuid not null references public.tenants(id),user_id uuid not null references auth.users(id),id uuid not null default gen_random_uuid(),payload jsonb not null check(octet_length(payload::text)<12000),updated_at timestamptz not null default now(),primary key(tenant_id,user_id),unique(tenant_id,id));
create table private.program_catalog(tenant_id uuid not null references public.tenants(id),id uuid not null default gen_random_uuid(),organization_id uuid,kind text not null check(kind in ('learning','opportunity')),title text not null check(length(title) between 1 and 200),description text not null check(length(description)<=2000),category text not null default '',jurisdiction text not null default '',requirements text not null default '',process text not null default '',deadline date,status text not null default 'pending' check(status in ('pending','approved','declined')),primary key(tenant_id,id),foreign key(tenant_id,organization_id) references public.organizations(tenant_id,id));
create table private.program_records(tenant_id uuid not null references public.tenants(id),id uuid not null default gen_random_uuid(),user_id uuid not null references auth.users(id),catalog_id uuid not null,kind text not null check(kind in ('learning','interest','outcome')),state text not null, note text not null default '' check(length(note)<=500),consent_wording text,consented_at timestamptz,created_at timestamptz not null default now(),primary key(tenant_id,id),unique(tenant_id,user_id,catalog_id,kind),foreign key(tenant_id,catalog_id) references private.program_catalog(tenant_id,id));
create function private.program_enabled() returns boolean language sql stable security definer set search_path='' as $$select coalesce((select enabled from private.program_modules where tenant_id=private.current_tenant()),false) and private.path_enabled()$$;
create function private.program_member() returns boolean language sql stable security definer set search_path='' as $$select private.path_uid() is not null and private.program_enabled() and (private.path_person() is not null or private.can_review('programs'))$$;
do $$declare tab text;begin foreach tab in array array['program_modules','program_profiles','program_catalog','program_records'] loop execute format('alter table private.%I enable row level security',tab);execute format('revoke all on private.%I from public,anon,authenticated',tab);end loop;end $$;
-- Tables are not exposed by PostgREST. SELECT policies also enforce the boundary for SQL clients.
create policy own_profile on private.program_profiles for select to authenticated using(tenant_id=private.current_tenant() and user_id=private.path_uid() and private.program_member());
create policy own_records on private.program_records for select to authenticated using(tenant_id=private.current_tenant() and user_id=private.path_uid() and private.program_member());
create function private.program_workspace() returns jsonb language plpgsql security definer set search_path='' as $$
declare t uuid:=private.current_tenant();u uuid:=private.path_uid();r jsonb;begin
 if not private.program_member() then raise exception 'Workspace membership required' using errcode='42501';end if;
 select jsonb_build_object('reviewer',private.can_review('programs'),'profile',(select payload from private.program_profiles where tenant_id=t and user_id=u),
 'organizations',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'name',o.name)) from public.organizations o join public.organization_members m on m.tenant_id=o.tenant_id and m.organization_id=o.id where o.tenant_id=t and m.user_id=u and m.verified_at is not null),'[]'::jsonb),
 'catalog',coalesce((select jsonb_agg(to_jsonb(c) order by c.title) from private.program_catalog c where c.tenant_id=t and (c.status='approved' or private.can_review('programs') or private.owns_organization(c.organization_id))),'[]'::jsonb),
 'records',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from private.program_records x where x.tenant_id=t and (x.user_id=u or private.can_review('programs') or (x.kind='interest' and x.consented_at is not null and exists(select 1 from private.program_catalog c where c.tenant_id=t and c.id=x.catalog_id and private.owns_organization(c.organization_id))))),'[]'::jsonb)) into r;return r;
end $$;
create function private.program_command(command jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare t uuid:=private.current_tenant();u uuid:=private.path_uid();op text:=command->>'type';cid uuid;v uuid;org uuid;p jsonb;c private.program_catalog;rec private.program_records;begin
 if not private.program_member() then raise exception 'Workspace membership required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(t::text,0));
 if octet_length(command::text)>16000 or command ?| array['tenant_id','user_id','role','reviewer','consent_wording','consented_at'] then raise exception 'Invalid command';end if;
 if op='profile' then
 p:=command->'payload';if jsonb_typeof(p)<>'object' or length(coalesce(p->>'name','')) not between 1 and 200 or (select count(*) from jsonb_object_keys(p))>12 or p-'name'-'background'-'interests'-'skills'-'affiliations'-'leadership'-'participation'-'availability'-'linkedin'-'introductionPreference'<>'{}'::jsonb then raise exception 'Invalid profile';end if;
 if coalesce(p->>'linkedin','')<>'' and p->>'linkedin' !~ '^https://(www\.)?linkedin\.com/in/[^ /]+/?$' then raise exception 'Invalid LinkedIn link';end if;
 insert into private.program_profiles(tenant_id,user_id,payload) values(t,u,p) on conflict(tenant_id,user_id) do update set payload=excluded.payload,updated_at=now() returning id into v;return v;
 elsif op='catalog' then
 org:=(command->>'organization_id')::uuid;if not private.owns_organization(org) then raise exception 'Verified organization membership required' using errcode='42501';end if;
 if command->>'kind' not in ('learning','opportunity') then raise exception 'Invalid kind';end if;
 insert into private.program_catalog(tenant_id,organization_id,kind,title,description,category,jurisdiction,requirements,process) values(t,org,command->>'kind',command->>'title',command->>'description',left(command->>'category',100),left(command->>'jurisdiction',100),left(command->>'requirements',1000),left(command->>'process',1000)) returning id into v;return v;
 elsif op='review' then
 if not private.can_review('programs') or command->>'state' not in ('approved','declined') then raise exception 'Review scope required' using errcode='42501';end if;
 update private.program_catalog set status=command->>'state' where tenant_id=t and id=(command->>'id')::uuid returning id into v;if v is null then raise exception 'Unavailable';end if;return v;
 elsif op='interest_decision' then
 select * into rec from private.program_records where tenant_id=t and id=(command->>'id')::uuid and kind='interest' and consented_at is not null for update;
 select * into c from private.program_catalog where tenant_id=t and id=rec.catalog_id;
 if rec.id is null or not private.owns_organization(c.organization_id) or command->>'state' not in ('conversation_invited','declined') then raise exception 'Organization scope required' using errcode='42501';end if;
 update private.program_records set state=command->>'state' where tenant_id=t and id=rec.id;return rec.id;
 elsif op in ('learning','interest','outcome') then
 cid:=(command->>'catalog_id')::uuid;select * into c from private.program_catalog where tenant_id=t and id=cid and status='approved';if c.id is null then raise exception 'Available activity required';end if;
 if op='learning' and (c.kind<>'learning' or command->>'state' not in ('reviewed','completed_self_reported')) then raise exception 'Invalid learning state';end if;
 if op in ('interest','outcome') and c.kind<>'opportunity' then raise exception 'Opportunity required';end if;
 if op='interest' and command->'consent'<>'true'::jsonb then raise exception 'Explicit permission required';end if;
 if op='interest' and command->'consent' is null then raise exception 'Explicit permission required';end if;
 if op='outcome' and not exists(select 1 from private.program_records where tenant_id=t and user_id=u and catalog_id=cid and kind='interest') then raise exception 'Record interest before participation';end if;
 insert into private.program_records(tenant_id,user_id,catalog_id,kind,state,note,consent_wording,consented_at) values(t,u,cid,op,case when op='learning' then command->>'state' when op='interest' then 'awaiting_response' else 'participation_self_reported' end,coalesce(command->>'note',''),case when op='interest' then 'Share this expression of interest with this opportunity organization. My private civic profile and email are not included.' end,case when op='interest' then now() end)
 on conflict(tenant_id,user_id,catalog_id,kind) do update set state=excluded.state,note=excluded.note,consent_wording=excluded.consent_wording,consented_at=excluded.consented_at returning id into v;return v;
 end if;raise exception 'Unknown command';end $$;
create function public.program_workspace() returns jsonb language sql security invoker set search_path='' as $$select private.program_workspace()$$;
create function public.program_command(command jsonb) returns uuid language sql security invoker set search_path='' as $$select private.program_command(command)$$;
revoke all on function private.program_enabled(),private.program_member(),private.program_workspace(),private.program_command(jsonb),public.program_workspace(),public.program_command(jsonb) from public,anon,authenticated;
grant execute on function private.program_enabled(),private.program_member(),private.program_workspace(),private.program_command(jsonb),public.program_workspace(),public.program_command(jsonb) to authenticated;
-- Extend canonical erasure atomically. Classification includes notes and arbitrary profile JSON,
-- including references to the subject in somebody else's record. Fail closed until classified.
alter function private.path_erase(uuid) rename to path_erase_core;
revoke all on function private.path_erase_core(uuid) from public,anon,authenticated;
create function private.path_erase(deletion_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare t uuid:=private.current_tenant();u uuid;tab text;missing boolean;begin
 if not private.can_review('privacy') then raise exception 'Privacy scope required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(t::text,0));
 select subject_id into u from private.path_deletion_requests where tenant_id=t and id=deletion_id and status='pending' for update;
 if u is null then raise exception 'Pending deletion required';end if;
 if exists(select 1 from private.retention_holds where tenant_id=t and subject_id=u) then raise exception 'Retention decision required';end if;
 lock table private.personal_data_inventory,private.program_profiles,private.program_catalog,private.program_records in share row exclusive mode;
 foreach tab in array array['program_profiles','program_catalog','program_records'] loop
 execute format('select exists(select 1 from private.%I r where tenant_id=$1 and not exists(select 1 from private.personal_data_inventory i where i.tenant_id=$1 and i.table_name=$2 and i.row_key=r.id::text))',tab) into missing using t,tab;
 if missing then raise exception 'Personal-data inventory incomplete: %',tab;end if;
 end loop;
 delete from private.program_records r where tenant_id=t and (user_id=u or exists(select 1 from private.personal_data_inventory i where i.tenant_id=t and i.table_name='program_records' and i.row_key=r.id::text and u=any(i.subjects)));
 delete from private.program_profiles r where tenant_id=t and (user_id=u or exists(select 1 from private.personal_data_inventory i where i.tenant_id=t and i.table_name='program_profiles' and i.row_key=r.id::text and u=any(i.subjects)));
 update private.program_catalog r set title='[erased]',description='',category='',jurisdiction='',requirements='',process='',deadline=null,status='declined' where tenant_id=t and exists(select 1 from private.personal_data_inventory i where i.tenant_id=t and i.table_name='program_catalog' and i.row_key=r.id::text and u=any(i.subjects));
 delete from private.personal_data_inventory where tenant_id=t and table_name in ('program_profiles','program_catalog','program_records') and u=any(subjects);
 return private.path_erase_core(deletion_id);
end $$;
revoke all on function private.path_erase(uuid) from public,anon,authenticated;
grant execute on function private.path_erase(uuid) to authenticated;
do $$declare tab text;begin foreach tab in array array['program_profiles','program_catalog','program_records'] loop execute format('create trigger invalidate_privacy_manifest after update or delete on private.%I for each row execute function private.invalidate_personal_inventory()',tab);end loop;end $$;
commit;
