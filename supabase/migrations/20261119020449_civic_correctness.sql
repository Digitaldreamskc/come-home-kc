begin;

-- Existing current records stay stable; history snapshots preserve each change.
create table private.program_events(
 sequence bigint generated always as identity, tenant_id uuid not null references public.tenants(id), id uuid not null default gen_random_uuid(),
 entity_type text not null check(entity_type in ('interest','catalog')), entity_id uuid not null,
 catalog_id uuid not null, subject_id uuid, actor_id uuid, kind text not null,
 snapshot jsonb not null, version text not null default '2026-11-19.1',
 created_at timestamptz not null default now(), primary key(tenant_id,id));
alter table private.program_events enable row level security;
revoke all on private.program_events from public,anon,authenticated;
create index program_events_entity on private.program_events(tenant_id,entity_id,created_at);
alter table private.program_catalog drop constraint program_catalog_status_check;
alter table private.program_catalog add constraint program_catalog_status_check check(status in ('pending','approved','declined','withdrawn','closed'));
create function private.program_available(c private.program_catalog) returns boolean language sql stable set search_path='' as $$
 select c.status='approved' and (c.deadline is null or c.deadline >= (now() at time zone 'America/Chicago')::date)
$$;
revoke all on function private.program_available(private.program_catalog) from public,anon,authenticated;
create function private.program_capture_event() returns trigger language plpgsql security definer set search_path='' as $$
declare k text;begin
 if current_setting('app.program_erasure',true)='on' and private.can_review('privacy') then return new;end if;
 if tg_table_name='program_records' then
 if new.kind<>'interest' then return new;end if;
 k:=case when tg_op='INSERT' then 'interest_submitted' when new.state='withdrawn' then 'interest_withdrawn' when new.state='awaiting_response' then 'interest_revised' else 'organization_decision' end;
 insert into private.program_events(tenant_id,entity_type,entity_id,catalog_id,subject_id,actor_id,kind,snapshot)
 values(new.tenant_id,'interest',new.id,new.catalog_id,new.user_id,auth.uid(),k,to_jsonb(new));
 else
 k:=case when tg_op='INSERT' then 'catalog_submitted' else 'catalog_decision' end;
 insert into private.program_events(tenant_id,entity_type,entity_id,catalog_id,actor_id,kind,snapshot)
 values(new.tenant_id,'catalog',new.id,new.id,auth.uid(),k,to_jsonb(new));
 end if;return new;end $$;
revoke all on function private.program_capture_event() from public,anon,authenticated;
-- Baselines describe only known present state; never invent lost historical submissions.
insert into private.program_events(tenant_id,entity_type,entity_id,catalog_id,subject_id,kind,snapshot)
 select tenant_id,'interest',id,catalog_id,user_id,'baseline_current_record',to_jsonb(r) from private.program_records r where kind='interest';
insert into private.program_events(tenant_id,entity_type,entity_id,catalog_id,kind,snapshot)
 select tenant_id,'catalog',id,id,'baseline_current_record',to_jsonb(c) from private.program_catalog c;
create trigger program_interest_history after insert or update on private.program_records for each row execute function private.program_capture_event();
create trigger program_catalog_history after insert or update on private.program_catalog for each row execute function private.program_capture_event();
create function private.program_history_guard() returns trigger language plpgsql security definer set search_path='' as $$begin
 if tg_op='DELETE' and current_setting('app.program_erasure',true)='on' and private.can_review('privacy') then return old;end if;
 raise exception 'Civic history is append-only outside authorized erasure';end $$;
revoke all on function private.program_history_guard() from public,anon,authenticated;
create trigger immutable_program_history before update or delete on private.program_events for each row execute function private.program_history_guard();
create trigger invalidate_privacy_manifest after update or delete on private.program_events for each row execute function private.invalidate_personal_inventory();


create or replace function private.program_workspace() returns jsonb language plpgsql security definer set search_path='' as $$
declare t uuid:=private.current_tenant();u uuid:=private.path_uid();r jsonb;begin
 if not private.program_member() then raise exception 'Workspace membership required' using errcode='42501';end if;
 select jsonb_build_object('reviewer',private.can_review('programs'),'profile',(select payload from private.program_profiles where tenant_id=t and user_id=u),
 'organizations',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'name',o.name)) from public.organizations o join public.organization_members m on m.tenant_id=o.tenant_id and m.organization_id=o.id where o.tenant_id=t and m.user_id=u and m.verified_at is not null),'[]'::jsonb),
 'catalog',coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('available',private.program_available(c)) order by c.title) from private.program_catalog c where c.tenant_id=t and (c.status='approved' or private.can_review('programs') or private.owns_organization(c.organization_id))),'[]'::jsonb),
 'records',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from private.program_records x where x.tenant_id=t and x.user_id=u),'[]'::jsonb),
 'review_records',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from private.program_records x where x.tenant_id=t and private.can_review('programs')),'[]'::jsonb),
 'organization_records',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at) from private.program_records x where x.tenant_id=t and x.kind='interest' and x.consented_at is not null and x.state<>'withdrawn' and exists(select 1 from private.program_catalog c where c.tenant_id=t and c.id=x.catalog_id and private.owns_organization(c.organization_id))),'[]'::jsonb),
 'history',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'entity_id',e.entity_id,'catalog_id',e.catalog_id,'kind',e.kind,'version',e.version,'created_at',e.created_at,'snapshot',e.snapshot) order by e.sequence) from private.program_events e where e.tenant_id=t and (e.subject_id=u or private.can_review('programs') or (e.entity_type='catalog' and exists(select 1 from private.program_catalog c where c.tenant_id=t and c.id=e.catalog_id and private.owns_organization(c.organization_id))))),'[]'::jsonb)) into r;return r;
end $$;

create or replace function private.program_command(command jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare t uuid:=private.current_tenant();u uuid:=private.path_uid();op text:=command->>'type';cid uuid;v uuid;org uuid;p jsonb;c private.program_catalog;rec private.program_records;k text;begin
 if not private.program_member() then raise exception 'Workspace membership required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(t::text,0));
 if octet_length(command::text)>16000 or command ?| array['tenant_id','user_id','role','reviewer','consent_wording','consented_at'] then raise exception 'Invalid command';end if;
 if op='profile' then
 p:=command->'payload';if jsonb_typeof(p)<>'object' or length(coalesce(p->>'name','')) not between 1 and 200 or (select count(*) from jsonb_object_keys(p))>12 or p-'name'-'background'-'interests'-'skills'-'affiliations'-'leadership'-'participation'-'availability'-'linkedin'-'introductionPreference'<>'{}'::jsonb then raise exception 'Invalid profile';end if;
 foreach k in array array['name','background','skills','affiliations','leadership','participation','availability','linkedin','introductionPreference'] loop
 if p ? k and (jsonb_typeof(p->k)<>'string' or length(p->>k)>500) then raise exception 'Invalid profile field';end if;
 end loop;
 if p ? 'interests' then
 if jsonb_typeof(p->'interests')<>'array' then raise exception 'Invalid interests';end if;
 if jsonb_array_length(p->'interests')>12 or exists(select 1 from jsonb_array_elements(p->'interests') x where jsonb_typeof(x)<>'string' or length(x::text)>82) then raise exception 'Invalid interests';end if;
 end if;
 if p ? 'introductionPreference' and p->>'introductionPreference' not in ('Ask me each time','Not seeking introductions') then raise exception 'Invalid preference';end if;
 if coalesce(p->>'linkedin','')<>'' and p->>'linkedin' !~ '^https://(www[.])?linkedin[.]com/in/[^ /]+/?$' then raise exception 'Invalid LinkedIn link';end if;
 insert into private.program_profiles(tenant_id,user_id,payload) values(t,u,p) on conflict(tenant_id,user_id) do update set payload=excluded.payload,updated_at=now() returning id into v;return v;
 elsif op='catalog' then
 org:=(command->>'organization_id')::uuid;if not private.owns_organization(org) then raise exception 'Verified organization membership required' using errcode='42501';end if;
 if command->>'kind' not in ('learning','opportunity') then raise exception 'Invalid kind';end if;
 insert into private.program_catalog(tenant_id,organization_id,kind,title,description,category,jurisdiction,requirements,process,deadline) values(t,org,command->>'kind',command->>'title',command->>'description',left(command->>'category',100),left(command->>'jurisdiction',100),left(command->>'requirements',1000),left(command->>'process',1000),nullif(command->>'deadline','')::date) returning id into v;return v;
 elsif op='catalog_status' then
 select * into c from private.program_catalog where tenant_id=t and id=(command->>'id')::uuid for update;
 if c.id is null or not private.owns_organization(c.organization_id) or coalesce(command->>'state','') not in ('closed','withdrawn') then raise exception 'Organization scope required' using errcode='42501';end if;
 update private.program_catalog set status=command->>'state' where tenant_id=t and id=c.id;return c.id;
 elsif op='withdraw_interest' then
 select * into rec from private.program_records where tenant_id=t and user_id=u and id=(command->>'id')::uuid and kind='interest' for update;
 if rec.id is null or rec.state='withdrawn' then raise exception 'Interest unavailable';end if;
 update private.program_records set state='withdrawn' where tenant_id=t and id=rec.id;return rec.id;
 elsif op='review' then
 if not private.can_review('programs') or command->>'state' not in ('approved','declined') then raise exception 'Review scope required' using errcode='42501';end if;
 if exists(select 1 from private.program_catalog where tenant_id=t and id=(command->>'id')::uuid and private.owns_organization(organization_id)) then raise exception 'An independent reviewer is required' using errcode='42501';end if;
 update private.program_catalog set status=command->>'state' where tenant_id=t and id=(command->>'id')::uuid and status in ('pending','approved','declined') returning id into v;if v is null then raise exception 'Unavailable';end if;return v;
 elsif op='interest_decision' then
 select * into rec from private.program_records where tenant_id=t and id=(command->>'id')::uuid and kind='interest' and consented_at is not null for update;
 select * into c from private.program_catalog where tenant_id=t and id=rec.catalog_id;
 if rec.id is null or not private.owns_organization(c.organization_id) or command->>'state' not in ('conversation_invited','declined') then raise exception 'Organization scope required' using errcode='42501';end if;
 if rec.state<>'awaiting_response' or not private.program_available(c) then raise exception 'Current available interest required';end if;
 update private.program_records set state=command->>'state' where tenant_id=t and id=rec.id;return rec.id;
 elsif op in ('learning','interest','outcome') then
 cid:=(command->>'catalog_id')::uuid;select * into c from private.program_catalog where tenant_id=t and id=cid and status='approved';if c.id is null then raise exception 'Available activity required';end if;
 if op in ('learning','interest') and not private.program_available(c) then raise exception 'Activity closed or expired';end if;
 if op='learning' and (c.kind<>'learning' or command->>'state' not in ('reviewed','completed_self_reported')) then raise exception 'Invalid learning state';end if;
 if op in ('interest','outcome') and c.kind<>'opportunity' then raise exception 'Opportunity required';end if;
 if op='interest' and command->'consent'<>'true'::jsonb then raise exception 'Explicit permission required';end if;
 if op='interest' and command->'consent' is null then raise exception 'Explicit permission required';end if;
 if op='outcome' and not exists(select 1 from private.program_records where tenant_id=t and user_id=u and catalog_id=cid and kind='interest' and state<>'withdrawn') then raise exception 'Record interest before participation';end if;
 insert into private.program_records(tenant_id,user_id,catalog_id,kind,state,note,consent_wording,consented_at) values(t,u,cid,op,case when op='learning' then command->>'state' when op='interest' then 'awaiting_response' else 'participation_self_reported' end,coalesce(command->>'note',''),case when op='interest' then 'Share this expression of interest with this opportunity organization. My private civic profile and email are not included.' end,case when op='interest' then now() end)
 on conflict(tenant_id,user_id,catalog_id,kind) do update set state=excluded.state,note=excluded.note,consent_wording=excluded.consent_wording,consented_at=excluded.consented_at returning id into v;return v;
 end if;raise exception 'Unknown command';end $$;

create or replace function private.path_edge_valid(e uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.path_relationships r
 join private.path_people a on a.tenant_id=r.tenant_id and a.id=r.person_a and a.active and not exists(select 1 from private.program_profiles p where p.tenant_id=a.tenant_id and p.user_id=a.user_id and p.payload->>'introductionPreference'='Not seeking introductions')
 join private.path_people b on b.tenant_id=r.tenant_id and b.id=r.person_b and b.active and not exists(select 1 from private.program_profiles p where p.tenant_id=b.tenant_id and p.user_id=b.user_id and p.payload->>'introductionPreference'='Not seeking introductions')
 where r.tenant_id=private.current_tenant() and r.id=e and r.revoked_at is null
 and (select count(*) from private.path_confirmations c where c.tenant_id=r.tenant_id and c.relationship_id=r.id and c.person_id in (r.person_a,r.person_b) and c.visible and c.willing and c.reconfirm_by>now())=2)
$$;

create or replace function private.path_command(command jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.path_uid();tid uuid:=private.current_tenant();pid uuid:=private.path_person();
 op text:=command->>'type';aid uuid;rid uuid;e1 private.path_relationships;e2 private.path_relationships;r private.path_requests;a private.path_attempts;connector uuid;recipient uuid;target text;role_name text;memo text:=coalesce(command->>'note','');
begin
 if tid is null or not private.path_enabled() then raise exception 'Workflow unavailable' using errcode='42501';end if;
 if jsonb_typeof(command)<>'object' or octet_length(command::text)>6000 or length(memo)>500 or command ?| array['actor','tenant_id','user_id','role','state','consent_wording','version'] then raise exception 'Invalid command';end if;
 -- Serialize all mutations in a tenant, including expiry and erasure, to close consent/action races.
 perform pg_advisory_xact_lock(hashtextextended(tid::text,0));
 if op='confirm' then
 select * into e1 from private.path_relationships where tenant_id=tid and id=(command->>'edge_id')::uuid for update;
 if pid is null or pid not in (e1.person_a,e1.person_b) or e1.id is null or e1.revoked_at is not null then raise exception 'Relationship access denied' using errcode='42501';end if;
 insert into private.path_confirmations values(tid,e1.id,pid,coalesce((command->>'visible')::boolean,false),coalesce((command->>'willing')::boolean,false),now(),now()+make_interval(months=>(select reconfirm_months from private.relationship_modules where tenant_id=tid)))
 on conflict(tenant_id,relationship_id,person_id) do update set visible=excluded.visible,willing=excluded.willing,confirmed_at=excluded.confirmed_at,reconfirm_by=excluded.reconfirm_by;
 return e1.id;
 elsif op='draft' then
 if pid is null then raise exception 'Participant access required' using errcode='42501';end if;
 select * into e1 from private.path_relationships where tenant_id=tid and id=(command->>'first_edge')::uuid;
 select * into e2 from private.path_relationships where tenant_id=tid and id=(command->>'second_edge')::uuid;
 if not private.path_edge_valid(e1.id) or not private.path_edge_valid(e2.id) or pid not in(e1.person_a,e1.person_b) then raise exception 'Path unavailable';end if;
 connector:=case when e1.person_a=pid then e1.person_b else e1.person_a end;
 if connector not in(e2.person_a,e2.person_b) then raise exception 'Path unavailable';end if;
 recipient:=case when e2.person_a=connector then e2.person_b else e2.person_a end;
 if recipient=pid then raise exception 'Circular path';end if;
 insert into private.path_requests(tenant_id,requester_id,connector_id,recipient_id,first_edge,second_edge) values(tid,pid,connector,recipient,e1.id,e2.id) returning id into rid;
 insert into private.path_attempts(tenant_id,request_id,attempt_no,note,opportunity) values(tid,rid,1,memo,coalesce(command->>'opportunity','')) returning id into aid;
 return aid;
 end if;
 aid:=(command->>'attempt_id')::uuid;
 select * into a from private.path_attempts where tenant_id=tid and id=aid for update;
 if a.id is null or not private.path_can_read(aid) then raise exception 'Request access denied' using errcode='42501';end if;
 select * into r from private.path_requests where tenant_id=tid and id=a.request_id;
 role_name:=case when pid=r.requester_id then 'requester' when pid=r.connector_id then 'connector' when pid=r.recipient_id then 'recipient' when private.can_review('introductions') then 'reviewer' else '' end;
 -- A reviewer cannot approve their own participating request.
 if op='revise' then
 if not private.path_edge_valid(r.first_edge) or not private.path_edge_valid(r.second_edge) then raise exception 'Path unavailable';end if;
 if role_name<>'requester' or a.state<>'changes_requested' or exists(select 1 from private.path_attempts where tenant_id=tid and request_id=r.id and invalidated_at is null) then raise exception 'Revision unavailable';end if;
 insert into private.path_attempts(tenant_id,request_id,attempt_no,note,opportunity) values(tid,r.id,a.attempt_no+1,a.note,a.opportunity) returning id into aid;
 return aid;
 end if;
 if a.invalidated_at is not null or (a.expires_at<=now() and a.introduced_at is null) then raise exception 'Attempt is closed or expired';end if;
 if op='save' then
 if role_name<>'requester' or a.state<>'draft' then raise exception 'Draft access denied';end if;
 update private.path_attempts set note=memo,opportunity=coalesce(command->>'opportunity',opportunity) where tenant_id=tid and id=aid;return aid;
 elsif op='followup' then
 if role_name<>'requester' or a.state<>'introduced' or not command ? 'connected' then raise exception 'Follow-up unavailable';end if;
 target:=case when (command->>'connected')::boolean then 'replied' else 'introduced' end;
 perform private.path_event(aid,case when target='replied' then 'connected' else 'not_yet' end,memo,'requester_team');
 update private.path_attempts set state=target where tenant_id=tid and id=aid;return aid;
 elsif op='information' then
 if not ((role_name='requester' and a.state in ('connector_reviewing','recipient_reviewing')) or (role_name='connector' and a.state='connector_reviewing') or (role_name='recipient' and a.state='recipient_reviewing')) or trim(memo)='' then raise exception 'Clarification unavailable';end if;
 perform private.path_event(aid,'clarification',memo);return aid;
 end if;
 if op<>'transition' then raise exception 'Unknown action';end if;
 target:=command->>'to';
 if not coalesce(case target
 when 'submitted' then role_name='requester' and a.state='draft'
 when 'connector_reviewing' then role_name='reviewer' and a.state='submitted'
 when 'connector_accepted' then role_name='connector' and a.state='connector_reviewing'
 when 'connector_declined' then role_name='connector' and a.state='connector_reviewing'
 when 'recipient_reviewing' then role_name='reviewer' and a.state='connector_accepted'
 when 'recipient_accepted' then role_name='recipient' and a.state='recipient_reviewing'
 when 'recipient_declined' then role_name='recipient' and a.state='recipient_reviewing'
 when 'introduced' then role_name='reviewer' and a.state='recipient_accepted'
 when 'changes_requested' then role_name='reviewer' and a.state in ('submitted','connector_accepted','recipient_accepted')
 when 'team_declined' then role_name='reviewer' and a.state in ('submitted','connector_accepted','recipient_accepted')
 when 'cancelled' then role_name='requester' and a.introduced_at is null
 when 'completed' then role_name='requester' and a.state='replied' else false end,false) then raise exception 'Action not permitted at this step' using errcode='42501';end if;
 if target in ('submitted','connector_reviewing','connector_accepted','recipient_reviewing','recipient_accepted','introduced') then
 if not private.path_edge_valid(r.first_edge) or not private.path_edge_valid(r.second_edge) then raise exception 'Path permissions need reconfirmation';end if;
 end if;
 if target='submitted' then
 if trim(a.note)='' or coalesce((command->>'share_context')::boolean,false) is not true then raise exception 'Explicit context permission and a note are required';end if;
 perform private.path_consent(aid,r.requester_id,'request_context',true);perform private.path_consent(aid,r.requester_id,'email_share',coalesce((command->>'share_email')::boolean,false));
 elsif target in ('connector_accepted','recipient_accepted') then
 if coalesce((command->>'consent')::boolean,false) is not true then raise exception 'Explicit acceptance required';end if;
 perform private.path_consent(aid,pid,case when target='connector_accepted' then 'connector_forward' else 'recipient_accept' end,true);
 if target='recipient_accepted' then perform private.path_consent(aid,pid,'email_share',coalesce((command->>'share_email')::boolean,false));end if;
 end if;
 if target in ('introduced','changes_requested') and trim(memo)='' then raise exception 'Review note required';end if;
 if target='introduced' and (select count(*) from private.path_consents where tenant_id=tid and attempt_id=aid and granted and purpose in ('request_context','connector_forward','recipient_accept'))<>3 then raise exception 'Fresh permissions required';end if;
 update private.path_attempts set state=target,
 connector_visible_at=case when target='connector_reviewing' then now() else connector_visible_at end,
 recipient_visible_at=case when target='recipient_reviewing' then now() else recipient_visible_at end,
 introduced_at=case when target='introduced' then now() else introduced_at end,
 invalidated_at=case when target in ('changes_requested','team_declined','connector_declined','recipient_declined','cancelled') then now() else invalidated_at end
 where tenant_id=tid and id=aid;
 perform private.path_event(aid,target,memo,case when target='completed' then 'requester_team' else 'participants' end);return aid;
end $$;

create or replace function private.path_workspace() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb:=private.path_workspace_core();t uuid:=private.current_tenant();pid uuid:=private.path_person();routes jsonb;begin
 select coalesce(jsonb_agg(r || jsonb_build_object('verification','Confirmed by both people','confirmed_at',(select min(confirmed_at) from private.path_confirmations where tenant_id=t and relationship_id in ((r->>'first_edge')::uuid,(r->>'second_edge')::uuid)), 'availability',case when exists(select 1 from private.path_requests q join private.path_attempts a on a.tenant_id=t and a.request_id=q.id where q.tenant_id=t and q.requester_id=pid and q.first_edge=(r->>'first_edge')::uuid and q.second_edge=(r->>'second_edge')::uuid and a.invalidated_at is null and a.state not in ('completed')) then 'Already requested' else 'Available' end)),'[]'::jsonb) into routes from jsonb_array_elements(result->'routes') r;
 return jsonb_set(result,'{routes}',routes)||jsonb_build_object('introductions_paused',exists(select 1 from private.program_profiles where tenant_id=t and user_id=private.path_uid() and payload->>'introductionPreference'='Not seeking introductions'));end $$;

create or replace function private.path_erase(deletion_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare t uuid:=private.current_tenant();u uuid;tab text;missing boolean;begin
 if not private.can_review('privacy') then raise exception 'Privacy scope required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(t::text,0));
 select subject_id into u from private.path_deletion_requests where tenant_id=t and id=deletion_id and status='pending' for update;
 if u is null then raise exception 'Pending deletion required';end if;
 if exists(select 1 from private.retention_holds where tenant_id=t and subject_id=u) then raise exception 'Retention decision required';end if;
 lock table private.personal_data_inventory,private.program_profiles,private.program_catalog,private.program_records,private.program_events in share row exclusive mode;
 foreach tab in array array['program_profiles','program_catalog','program_records','program_events'] loop
 execute format('select exists(select 1 from private.%I r where tenant_id=$1 and not exists(select 1 from private.personal_data_inventory i where i.tenant_id=$1 and i.table_name=$2 and i.row_key=r.id::text))',tab) into missing using t,tab;
 if missing then raise exception 'Personal-data inventory incomplete: %',tab;end if;
 end loop;
 perform set_config('app.program_erasure','on',true);
 delete from private.program_events e where tenant_id=t and (subject_id=u or actor_id=u or exists(select 1 from private.personal_data_inventory i where i.tenant_id=t and i.table_name='program_events' and i.row_key=e.id::text and u=any(i.subjects)));
 delete from private.program_records r where tenant_id=t and (user_id=u or exists(select 1 from private.personal_data_inventory i where i.tenant_id=t and i.table_name='program_records' and i.row_key=r.id::text and u=any(i.subjects)));
 delete from private.program_profiles r where tenant_id=t and (user_id=u or exists(select 1 from private.personal_data_inventory i where i.tenant_id=t and i.table_name='program_profiles' and i.row_key=r.id::text and u=any(i.subjects)));
 update private.program_catalog r set title='[erased]',description='',category='',jurisdiction='',requirements='',process='',deadline=null,status='declined' where tenant_id=t and exists(select 1 from private.personal_data_inventory i where i.tenant_id=t and i.table_name='program_catalog' and i.row_key=r.id::text and u=any(i.subjects));
 delete from private.personal_data_inventory where tenant_id=t and table_name in ('program_profiles','program_catalog','program_records','program_events') and u=any(subjects);
 perform set_config('app.program_erasure','off',true);
 return private.path_erase_core(deletion_id);
end $$;

commit;
