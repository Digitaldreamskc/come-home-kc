begin;
-- Sensitive RPCs and RLS reads reject revoked/deleted/expired Auth sessions.
create or replace function private.path_uid() returns uuid language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid();sid uuid;begin
 if u is null or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null and (banned_until is null or banned_until<now())) then raise exception 'Verified sign-in required' using errcode='42501';end if;
 sid:=nullif(auth.jwt()->>'session_id','')::uuid;
 if sid is null or not exists(select 1 from auth.sessions where id=sid and user_id=u and (not_after is null or not_after>now())) then raise exception 'Active session required' using errcode='42501';end if;return u;end $$;
create or replace function private.path_can_read(aid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.path_uid() is not null and private.path_enabled() and exists(select 1 from private.path_attempts a join private.path_requests r on r.tenant_id=a.tenant_id and r.id=a.request_id
 where a.tenant_id=private.current_tenant() and a.id=aid and (r.requester_id=private.path_person() or (a.state<>'draft' and private.can_review('introductions')) or (a.connector_visible_at is not null and r.connector_id=private.path_person()) or (a.recipient_visible_at is not null and r.recipient_id=private.path_person())))
$$;
-- Legacy staff tools keep their data, but require explicit introduction-review scope.
alter policy admin_all on public.introduction_requests using(private.can_review('introductions')) with check(private.can_review('introductions'));
alter policy admin_all on public.introductions using(private.can_review('introductions')) with check(private.can_review('introductions'));
alter policy admin_all on public.outcomes using(private.can_review('introductions')) with check(private.can_review('introductions'));

create function private.path_request_deletion() returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.path_uid();t uuid:=private.current_tenant();v uuid;begin
 if t is null then raise exception 'Tenant required';end if;
 perform pg_advisory_xact_lock(hashtextextended(t::text,0));
 select id into v from private.path_deletion_requests where tenant_id=t and subject_id=u and status='pending';
 if v is null then insert into private.path_deletion_requests(tenant_id,subject_id) values(t,u) returning id into v;end if;return v;end $$;
create function private.path_deletion_queue() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=private.path_uid();begin
 return coalesce((select jsonb_agg(jsonb_build_object('id',id,'status',status,'created_at',created_at,'completed_at',completed_at)) from private.path_deletion_requests where tenant_id=private.current_tenant() and (subject_id=u or private.can_review('privacy'))),'[]'::jsonb);end $$;
create function private.legacy_personal_key(row_data jsonb) returns text language sql immutable set search_path='' as $$
 select coalesce(row_data->>'id',(row_data->>'source_program')||':'||(row_data->>'collection')||':'||(row_data->>'legacy_id'))
$$;
create function private.path_erase(deletion_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare operator_id uuid:=private.path_uid();t uuid:=private.current_tenant();u uuid;p uuid;aids uuid[];legacy_ids text[];x record;table_name text;unmapped boolean;intro_ids uuid[];request_ids uuid[];
begin
 if not private.can_review('privacy') then raise exception 'Tenant privacy-review scope required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(t::text,0));
 select subject_id into u from private.path_deletion_requests where tenant_id=t and id=deletion_id and status='pending' for update;
 if u is null then raise exception 'Pending deletion request required';end if;
 if exists(select 1 from private.retention_holds where tenant_id=t and subject_id=u) then raise exception 'Retention hold requires a documented minimization decision before erasure';end if;
 -- No guesswork about unstructured personal data. A DB operator must classify legacy rows first.
 foreach table_name in array array['tasks','employer_conversations','job_needs','evidence_sources','import_batches','import_records','legacy_identity_map','organizations','job_postings','resources','events'] loop
 execute format('select exists(select 1 from public.%I r where r.tenant_id=$1 and not exists(select 1 from private.personal_data_inventory i where i.tenant_id=$1 and i.table_name=$2 and i.row_key=private.legacy_personal_key(to_jsonb(r))))',table_name) into unmapped using t,table_name;
 if unmapped then raise exception 'Legacy personal-data inventory incomplete: %',table_name;end if;
 end loop;
 select id into p from private.path_people where tenant_id=t and user_id=u;
 select coalesce(array_agg(a.id),'{}') into aids from private.path_attempts a join private.path_requests r on r.tenant_id=t and r.id=a.request_id where a.tenant_id=t and p in(r.requester_id,r.connector_id,r.recipient_id);
 delete from private.path_event_notes n using private.path_events e where n.tenant_id=t and e.tenant_id=t and e.id=n.event_id and (e.attempt_id=any(aids) or e.actor_id=u);
 update private.path_events set actor_id=null where tenant_id=t and (attempt_id=any(aids) or actor_id=u);
 update private.path_attempts set state='erased',note='',opportunity='',invalidated_at=coalesce(invalidated_at,now()) where tenant_id=t and id=any(aids);
 update private.path_consents set person_id=null where tenant_id=t and person_id=p;
 delete from private.path_confirmations where tenant_id=t and relationship_id in(select id from private.path_relationships where tenant_id=t and p in(person_a,person_b));
 update private.path_relationships set context='[erased]',revoked_at=now() where tenant_id=t and p in(person_a,person_b);
 update private.path_people set user_id=null,display_name='[deleted participant]',active=false where tenant_id=t and id=p;

 select coalesce(array_agg(id),'{}') into request_ids from public.introduction_requests where tenant_id=t and candidate_user_id=u;
 select coalesce(array_agg(id),'{}') into intro_ids from public.introductions where tenant_id=t and (candidate_user_id=u or request_id=any(request_ids));
 select coalesce(array_agg(id::text),'{}') into legacy_ids from public.outcomes where tenant_id=t and introduction_id=any(intro_ids);
 legacy_ids:=legacy_ids||array(select id::text from public.submissions where tenant_id=t and user_id=u)||array(select id::text from public.communications_consent where tenant_id=t and user_id=u)||array(select unnest(request_ids)::text)||array(select unnest(intro_ids)::text)||array[u::text];
 delete from public.outcomes where tenant_id=t and introduction_id=any(intro_ids);
 delete from public.introductions where tenant_id=t and id=any(intro_ids);
 delete from public.introduction_requests where tenant_id=t and id=any(request_ids);
 delete from private.employer_status_email_queue where tenant_id=t and recipient_user_id=u;
 delete from public.submissions where tenant_id=t and user_id=u;
 update public.submissions set reviewed_by=null,review_note='' where tenant_id=t and reviewed_by=u;
 delete from public.candidate_profiles where tenant_id=t and user_id=u;
 delete from public.communications_consent where tenant_id=t and user_id=u;
 delete from public.organization_members where tenant_id=t and user_id=u;
 update public.job_postings set created_by=null where tenant_id=t and created_by=u;
 delete from public.user_roles where tenant_id=t and user_id=u;
 delete from private.workflow_reviewers where tenant_id=t and user_id=u;
 delete from private.rate_limits where key like 'intake:'||t::text||':'||u::text||'%';
 for x in select * from private.personal_data_inventory where tenant_id=t and u=any(subjects) loop
 legacy_ids:=array_append(legacy_ids,x.row_key);
 case x.table_name
 when 'tasks' then update public.tasks set action='[erased]',owner='',notes='',source_record='{}',due_date=null where tenant_id=t and id::text=x.row_key;
 when 'employer_conversations' then update public.employer_conversations set contact='',relationship_kind='',notes='',next_action='',owner='',source_url=null,source_record='{}' where tenant_id=t and id::text=x.row_key;
 when 'job_needs' then update public.job_needs set title='[erased]',details='',source_record='{}' where tenant_id=t and id::text=x.row_key;
 when 'evidence_sources' then update public.evidence_sources set source_url=null,notes='',record_id=null where tenant_id=t and id::text=x.row_key;
 when 'import_batches' then update public.import_batches set source_name='[erased]',source_data='{}',report='{}',imported_by=null,fingerprint=id::text where tenant_id=t and id::text=x.row_key;
 when 'import_records' then update public.import_records set original_record='{}',legacy_id=id::text,reason='',target_id=null where tenant_id=t and id::text=x.row_key;
 when 'legacy_identity_map' then delete from public.legacy_identity_map m where m.tenant_id=t and private.legacy_personal_key(to_jsonb(m))=x.row_key;
 when 'organizations' then update public.organizations set name='[erased]',description='',website=null,source_url=null where tenant_id=t and id::text=x.row_key;
 when 'job_postings' then update public.job_postings set title='[erased]',description='',application_url=null,application_instructions='',salary_range=null,status='archived',verified_at=null where tenant_id=t and id::text=x.row_key;
 when 'resources' then update public.resources set title='[erased]',description='',url='https://example.invalid/erased',contact_url=null,source_url=null,status='archived',verified_at=null where tenant_id=t and id::text=x.row_key;
 when 'events' then update public.events set title='[erased]',description='',location='',audience='',registration_url='https://example.invalid/erased',status='archived',verified_at=null where tenant_id=t and id::text=x.row_key;
 else raise exception 'Unsupported inventory table';end case;
 end loop;
 -- Also remove subject attribution from manifests and residual audit identifiers.
 update private.personal_data_inventory set subjects=array_remove(subjects,u) where tenant_id=t and u=any(subjects);
 update public.audit_history set actor_id=null,record_id=null where tenant_id=t and (actor_id=u or record_id=any(legacy_ids));
 update private.path_deletion_requests set subject_id=null,status='completed',completed_at=now() where tenant_id=t and subject_id=u;
 return jsonb_build_object('status','completed','scope','current workspace','attempts_anonymized',cardinality(aids),'auth_identity','Shared sign-in identity is retained for other workspaces. Global account deletion requires a separate Auth-admin operation.');
end $$;

create function public.path_request_deletion() returns uuid language sql security invoker set search_path='' as $$select private.path_request_deletion()$$;
create function public.path_deletion_queue() returns jsonb language sql security invoker set search_path='' as $$select private.path_deletion_queue()$$;
create function public.path_erase(deletion_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.path_erase(deletion_id)$$;
revoke all on function private.path_request_deletion(),private.path_deletion_queue(),private.path_erase(uuid),private.legacy_personal_key(jsonb),public.path_request_deletion(),public.path_deletion_queue(),public.path_erase(uuid) from public,anon,authenticated;
grant execute on function private.path_request_deletion(),private.path_deletion_queue(),private.path_erase(uuid),public.path_request_deletion(),public.path_deletion_queue(),public.path_erase(uuid) to authenticated;

-- Scheduler has no client EXECUTE grant. Expiry never depends on a page load.
create function private.expire_path_attempts() returns int language plpgsql security definer set search_path='' as $$
declare t uuid;r record;num int:=0;begin
 for t in select tenant_id from private.relationship_modules loop
 perform pg_advisory_xact_lock(hashtextextended(t::text,0));
 for r in update private.path_attempts set state='expired',invalidated_at=now() where tenant_id=t and invalidated_at is null and introduced_at is null and state<>'draft' and expires_at<=now() returning id loop
 insert into private.path_events(tenant_id,attempt_id,kind) values(t,r.id,'expired');num:=num+1;
 end loop;end loop;return num;end $$;
revoke all on function private.expire_path_attempts() from public,anon,authenticated;
create extension if not exists pg_cron;
select cron.schedule('relationship-attempt-expiry','*/5 * * * *','select private.expire_path_attempts()');
commit;
