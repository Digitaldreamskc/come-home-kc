begin;
-- Additive Phase 2 module. Existing tenant IDs, Auth identities and migrations stay intact.
create table private.workflow_reviewers (
 tenant_id uuid not null references public.tenants(id), user_id uuid not null references auth.users(id) on delete cascade,
 workflow text not null check(workflow in ('introductions','privacy','profiles')), primary key(tenant_id,user_id,workflow)
);
create table private.relationship_modules (
 tenant_id uuid primary key references public.tenants(id), enabled boolean not null default false,
 title text not null default 'Find your path', reconfirm_months int not null default 12 check(reconfirm_months between 1 and 24)
);
insert into private.relationship_modules(tenant_id) select id from public.tenants;
create table private.path_people (
 tenant_id uuid not null references public.tenants(id), id uuid not null default gen_random_uuid(),
 user_id uuid references auth.users(id) on delete set null, display_name text not null check(length(display_name) between 1 and 200),
 active boolean not null default true, primary key(tenant_id,id), unique(tenant_id,user_id)
);
create table private.path_relationships (
 tenant_id uuid not null references public.tenants(id), id uuid not null default gen_random_uuid(),
 person_a uuid not null, person_b uuid not null, context text not null check(length(context) between 1 and 500),
 revoked_at timestamptz, primary key(tenant_id,id), check(person_a<>person_b),
 foreign key(tenant_id,person_a) references private.path_people(tenant_id,id),
 foreign key(tenant_id,person_b) references private.path_people(tenant_id,id)
);
create unique index path_relationship_pair on private.path_relationships(tenant_id,least(person_a,person_b),greatest(person_a,person_b));
create table private.path_confirmations (
 tenant_id uuid not null, relationship_id uuid not null, person_id uuid not null,
 visible boolean not null, willing boolean not null, confirmed_at timestamptz not null default now(), reconfirm_by timestamptz not null,
 primary key(tenant_id,relationship_id,person_id),
 foreign key(tenant_id,relationship_id) references private.path_relationships(tenant_id,id),
 foreign key(tenant_id,person_id) references private.path_people(tenant_id,id)
);
create table private.path_requests (
 tenant_id uuid not null, id uuid not null default gen_random_uuid(), requester_id uuid not null, connector_id uuid not null, recipient_id uuid not null,
 first_edge uuid not null, second_edge uuid not null, created_at timestamptz not null default now(),
 primary key(tenant_id,id),check(requester_id<>connector_id and connector_id<>recipient_id and requester_id<>recipient_id),
 foreign key(tenant_id,requester_id) references private.path_people(tenant_id,id),foreign key(tenant_id,connector_id) references private.path_people(tenant_id,id),foreign key(tenant_id,recipient_id) references private.path_people(tenant_id,id),
 foreign key(tenant_id,first_edge) references private.path_relationships(tenant_id,id),foreign key(tenant_id,second_edge) references private.path_relationships(tenant_id,id)
);
create table private.path_attempts (
 tenant_id uuid not null, id uuid not null default gen_random_uuid(), request_id uuid not null, attempt_no int not null,
 state text not null default 'draft' check(state in ('draft','submitted','connector_reviewing','connector_accepted','recipient_reviewing','recipient_accepted','introduced','replied','completed','changes_requested','team_declined','connector_declined','recipient_declined','cancelled','expired','erased')),
 note text not null default '' check(length(note)<=500), opportunity text not null default '' check(length(opportunity)<=200),
 connector_visible_at timestamptz,recipient_visible_at timestamptz,introduced_at timestamptz,
 expires_at timestamptz not null default now()+interval '14 days', invalidated_at timestamptz, created_at timestamptz not null default now(),
 primary key(tenant_id,id),unique(tenant_id,request_id,attempt_no),foreign key(tenant_id,request_id) references private.path_requests(tenant_id,id)
);
create unique index path_one_active_attempt on private.path_attempts(tenant_id,request_id) where invalidated_at is null;
create table private.path_consents (
 tenant_id uuid not null, id uuid not null default gen_random_uuid(),attempt_id uuid not null,person_id uuid,
 purpose text not null check(purpose in ('request_context','connector_forward','recipient_accept','email_share')),
 wording text not null,version text not null,granted boolean not null,recorded_at timestamptz not null default now(),
 primary key(tenant_id,id),unique(tenant_id,attempt_id,person_id,purpose),
 foreign key(tenant_id,attempt_id) references private.path_attempts(tenant_id,id),foreign key(tenant_id,person_id) references private.path_people(tenant_id,id)
);
create table private.path_events (
 tenant_id uuid not null,id bigint generated always as identity,attempt_id uuid not null,actor_id uuid references auth.users(id) on delete set null,
 kind text not null,created_at timestamptz not null default now(),primary key(tenant_id,id),
 foreign key(tenant_id,attempt_id) references private.path_attempts(tenant_id,id)
);
-- Mutable/redactable text is separate from append-only event facts. Never put arbitrary JSON in facts.
create table private.path_event_notes (
 tenant_id uuid not null,event_id bigint not null,note text not null check(length(note)<=500),
 audience text not null check(audience in ('participants','requester_team')),primary key(tenant_id,event_id),
 foreign key(tenant_id,event_id) references private.path_events(tenant_id,id)
);
create table private.path_deletion_requests (
 tenant_id uuid not null,id uuid not null default gen_random_uuid(),subject_id uuid references auth.users(id) on delete set null,
 status text not null default 'pending' check(status in ('pending','completed')),created_at timestamptz not null default now(),completed_at timestamptz,
 primary key(tenant_id,id)
);
-- Operator-reviewed attribution inventory for legacy free-text/import stores. Empty subjects means reviewed as non-personal.
create table private.personal_data_inventory (
 tenant_id uuid not null references public.tenants(id),table_name text not null,row_key text not null,subjects uuid[] not null,
 reviewed_at timestamptz not null default now(),primary key(tenant_id,table_name,row_key)
);
create table private.retention_holds (
 tenant_id uuid not null references public.tenants(id),subject_id uuid not null references auth.users(id),
 authority_reference text not null,review_by date not null,primary key(tenant_id,subject_id)
);

create function private.path_uid() returns uuid language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid(); sid uuid; begin
 if u is null or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null and (banned_until is null or banned_until<now())) then raise exception 'Verified sign-in required' using errcode='42501';end if;
 sid:=nullif(auth.jwt()->>'session_id','')::uuid;
 if sid is null or not exists(select 1 from auth.sessions where id=sid and user_id=u) then raise exception 'Active session required' using errcode='42501';end if;
 return u;end $$;
create function private.can_review(w text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.workflow_reviewers where tenant_id=private.current_tenant() and user_id=auth.uid() and workflow=w)
$$;
create function private.path_person() returns uuid language sql stable security definer set search_path='' as $$
 select id from private.path_people where tenant_id=private.current_tenant() and user_id=auth.uid() and active
$$;
create function private.path_enabled() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select enabled from private.relationship_modules where tenant_id=private.current_tenant()),false)
$$;
create function private.path_edge_valid(e uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.path_relationships r
 join private.path_people a on a.tenant_id=r.tenant_id and a.id=r.person_a and a.active
 join private.path_people b on b.tenant_id=r.tenant_id and b.id=r.person_b and b.active
 where r.tenant_id=private.current_tenant() and r.id=e and r.revoked_at is null
 and (select count(*) from private.path_confirmations c where c.tenant_id=r.tenant_id and c.relationship_id=r.id and c.person_id in (r.person_a,r.person_b) and c.visible and c.willing and c.reconfirm_by>now())=2)
$$;
create function private.path_can_read(aid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.path_attempts a join private.path_requests r on r.tenant_id=a.tenant_id and r.id=a.request_id
 where a.tenant_id=private.current_tenant() and a.id=aid and (r.requester_id=private.path_person() or
 (a.state<>'draft' and private.can_review('introductions')) or
 (a.connector_visible_at is not null and r.connector_id=private.path_person()) or
 (a.recipient_visible_at is not null and r.recipient_id=private.path_person())))
$$;

do $$ declare t text;begin
 foreach t in array array['workflow_reviewers','relationship_modules','path_people','path_relationships','path_confirmations','path_requests','path_attempts','path_consents','path_events','path_event_notes','path_deletion_requests','personal_data_inventory','retention_holds'] loop
 execute format('alter table private.%I enable row level security',t);
 execute format('revoke all on private.%I from public,anon,authenticated',t);
 execute format('create trigger immutable_tenant before update on private.%I for each row execute function private.guard_tenant()',t);
 end loop;
end $$;
-- Read policies are defense-in-depth for direct SQL roles; all writes use the checked command function.
grant select on private.path_attempts,private.path_consents,private.path_events,private.path_event_notes to authenticated;
create policy attempts_read on private.path_attempts for select to authenticated using(tenant_id=private.current_tenant() and private.path_can_read(id));
create policy consents_read on private.path_consents for select to authenticated using(tenant_id=private.current_tenant() and private.path_can_read(attempt_id));
create policy events_read on private.path_events for select to authenticated using(tenant_id=private.current_tenant() and private.path_can_read(attempt_id));
create policy event_notes_read on private.path_event_notes for select to authenticated using(tenant_id=private.current_tenant() and exists(select 1 from private.path_events e join private.path_attempts a on a.tenant_id=e.tenant_id and a.id=e.attempt_id join private.path_requests r on r.tenant_id=a.tenant_id and r.id=a.request_id where e.tenant_id=path_event_notes.tenant_id and e.id=event_id and private.path_can_read(a.id) and (audience='participants' or private.can_review('introductions') or r.requester_id=private.path_person())));

create function private.path_event(aid uuid,k text,n text default '',aud text default 'participants') returns void language plpgsql security definer set search_path='' as $$
declare eid bigint;begin
 insert into private.path_events(tenant_id,attempt_id,actor_id,kind) values(private.current_tenant(),aid,auth.uid(),k) returning id into eid;
 if length(trim(n))>0 then insert into private.path_event_notes values(private.current_tenant(),eid,n,aud);end if;
end $$;
create function private.path_consent(aid uuid,p uuid,purpose_name text,yes boolean) returns void language plpgsql security definer set search_path='' as $$
declare words text;begin
 words:=case purpose_name
 when 'request_context' then 'Share my display name, this note, and the selected opportunity with the named connector and recipient if the team approves each step. My private profile and resume are not included.'
 when 'connector_forward' then 'I agree to help with this introduction and permit the team to forward this approved request to the named recipient.'
 when 'recipient_accept' then 'I accept this specific introduction. My private profile remains private.'
 when 'email_share' then 'Share my email only with the other named participant after the team records this introduction. This does not approve future introductions.' end;
 if words is null then raise exception 'Unknown consent';end if;
 insert into private.path_consents(tenant_id,attempt_id,person_id,purpose,wording,version,granted) values(private.current_tenant(),aid,p,purpose_name,words,'2026-11-18.1',yes);
end $$;

create function private.path_command(command jsonb) returns uuid language plpgsql security definer set search_path='' as $$
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

create function private.path_contacts(aid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=private.path_uid();tid uuid:=private.current_tenant();p uuid:=private.path_person();a private.path_attempts;r private.path_requests;other uuid;addr text;begin
 if not private.path_enabled() then raise exception 'Workflow unavailable';end if;
 select * into a from private.path_attempts where tenant_id=tid and id=aid;
 select * into r from private.path_requests where tenant_id=tid and id=a.request_id;
 if a.id is null or not private.path_can_read(aid) then raise exception 'Request access denied' using errcode='42501';end if;
 if a.introduced_at is null or a.invalidated_at is not null then return '{}'::jsonb;end if;
 other:=case when p=r.requester_id then r.recipient_id when p=r.recipient_id then r.requester_id else null end;
 if other is null or not exists(select 1 from private.path_consents where tenant_id=tid and attempt_id=aid and person_id=other and purpose='email_share' and granted) then return '{}'::jsonb;end if;
 select u.email into addr from auth.users u join private.path_people p on p.user_id=u.id where p.tenant_id=tid and p.id=other and p.active and u.email_confirmed_at is not null;
 return case when addr is null then '{}'::jsonb else jsonb_build_object('email',addr) end;
end $$;

create function private.path_workspace() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=private.path_uid();tid uuid:=private.current_tenant();pid uuid:=private.path_person();result jsonb;begin
 if tid is null or not private.path_enabled() then raise exception 'Workflow unavailable' using errcode='42501';end if;
 select jsonb_build_object('title',m.title,'reviewer',private.can_review('introductions'),'person_id',pid,
 'display_name',(select display_name from private.path_people where tenant_id=tid and id=pid),
 'routes',coalesce((select jsonb_agg(jsonb_build_object('first_edge',e1.id,'second_edge',e2.id,'connector',c.display_name,'recipient',d.display_name,'first_context',e1.context,'second_context',e2.context)) from private.path_relationships e1
 join private.path_people c on c.tenant_id=tid and c.id=case when e1.person_a=pid then e1.person_b else e1.person_a end
 join private.path_relationships e2 on e2.tenant_id=tid and c.id in(e2.person_a,e2.person_b) and e2.id<>e1.id
 join private.path_people d on d.tenant_id=tid and d.id=case when e2.person_a=c.id then e2.person_b else e2.person_a end
 where e1.tenant_id=tid and pid in(e1.person_a,e1.person_b) and d.id<>pid and private.path_edge_valid(e1.id) and private.path_edge_valid(e2.id)),'[]'::jsonb),
 'relationships',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'context',e.context,'other',p.display_name,'visible',coalesce(c.visible,false),'willing',coalesce(c.willing,false),'confirmed_at',c.confirmed_at,'reconfirm_by',c.reconfirm_by)) from private.path_relationships e join private.path_people p on p.tenant_id=tid and p.id=case when e.person_a=pid then e.person_b else e.person_a end left join private.path_confirmations c on c.tenant_id=tid and c.relationship_id=e.id and c.person_id=pid where e.tenant_id=tid and pid in(e.person_a,e.person_b) and e.revoked_at is null),'[]'::jsonb),
 'attempts',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'request_id',r.id,'attempt_no',a.attempt_no,'state',a.state,'note',a.note,'opportunity',a.opportunity,'expires_at',a.expires_at,'invalidated_at',a.invalidated_at,
 'requester',q.display_name,'connector',c.display_name,'recipient',d.display_name,
 'role',case when pid=r.requester_id then 'requester' when pid=r.connector_id then 'connector' when pid=r.recipient_id then 'recipient' else 'reviewer' end,
 'consents',coalesce((select jsonb_agg(jsonb_build_object('person_id',person_id,'purpose',purpose,'wording',wording,'version',version,'granted',granted,'recorded_at',recorded_at,'effective',a.invalidated_at is null and (a.expires_at>now() or a.introduced_at is not null))) from private.path_consents where tenant_id=tid and attempt_id=a.id),'[]'::jsonb),
 'events',coalesce((select jsonb_agg(jsonb_build_object('kind',e.kind,'at',e.created_at,'note',case when n.audience='participants' or pid=r.requester_id or private.can_review('introductions') then n.note else null end) order by e.id) from private.path_events e left join private.path_event_notes n on n.tenant_id=e.tenant_id and n.event_id=e.id where e.tenant_id=tid and e.attempt_id=a.id),'[]'::jsonb)) order by a.created_at)
 from private.path_attempts a join private.path_requests r on r.tenant_id=tid and r.id=a.request_id join private.path_people q on q.tenant_id=tid and q.id=r.requester_id join private.path_people c on c.tenant_id=tid and c.id=r.connector_id join private.path_people d on d.tenant_id=tid and d.id=r.recipient_id where a.tenant_id=tid and private.path_can_read(a.id)),'[]'::jsonb)) into result from private.relationship_modules m where m.tenant_id=tid;
 return result;end $$;

-- Client callable wrappers are invoker functions; privileged implementation lives in the unexposed schema.
create function public.path_workspace() returns jsonb language sql security invoker set search_path='' as $$select private.path_workspace()$$;
create function public.path_command(command jsonb) returns uuid language sql security invoker set search_path='' as $$select private.path_command(command)$$;
create function public.path_contacts(attempt_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.path_contacts(attempt_id)$$;
do $$ declare f record;begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('private','public') and (p.proname like 'path_%' or p.proname='can_review') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 end loop;end $$;
grant execute on function private.path_uid(),private.can_review(text),private.path_person(),private.path_enabled(),private.path_can_read(uuid) to authenticated;
grant execute on function private.path_workspace(),private.path_command(jsonb),private.path_contacts(uuid),public.path_workspace(),public.path_command(jsonb),public.path_contacts(uuid) to authenticated;

-- Replace ambient administrator access to sensitive profile/consent tables with scoped review.
drop policy admin_all on public.candidate_profiles;
create policy profile_reviewer_read on public.candidate_profiles for select to authenticated using(private.can_review('profiles'));
drop policy admin_all on public.communications_consent;
create policy consent_reviewer_read on public.communications_consent for select to authenticated using(private.can_review('privacy'));
-- Consent history remains append-only to clients; profile trigger continues to record changes.
revoke update,delete on public.communications_consent from authenticated;
commit;
