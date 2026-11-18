begin;
create or replace function private.legacy_personal_key(row_data jsonb) returns text language sql immutable set search_path='' as $$
 select coalesce(row_data->>'id',row_data->>'event_id',(row_data->>'source_program')||':'||(row_data->>'collection')||':'||(row_data->>'legacy_id'))
$$;
create or replace function private.path_erase(deletion_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare operator_id uuid:=private.path_uid();t uuid:=private.current_tenant();u uuid;p uuid;aids uuid[];legacy_ids text[];x record;table_name text;unmapped boolean;intro_ids uuid[];request_ids uuid[];manifest jsonb;
begin
 if not private.can_review('privacy') then raise exception 'Tenant privacy-review scope required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(t::text,0));
 select subject_id into u from private.path_deletion_requests where tenant_id=t and id=deletion_id and status='pending' for update;
 if u is null then raise exception 'Pending deletion request required';end if;
 if exists(select 1 from private.retention_holds where tenant_id=t and subject_id=u) then raise exception 'Retention hold requires a documented minimization decision before erasure';end if;
 -- No guesswork about unstructured personal data. A DB operator must classify legacy rows first.
 foreach table_name in array array['tasks','employer_conversations','job_needs','evidence_sources','import_batches','import_records','legacy_identity_map','organizations','job_postings','resources','events','submissions','introduction_requests','introductions','outcomes','organization_locations','job_locations','resource_eligibility','path_attempts','path_event_notes','path_relationships'] loop
 execute format('select exists(select 1 from %I.%I r where r.tenant_id=$1 and not exists(select 1 from private.personal_data_inventory i where i.tenant_id=$1 and i.table_name=$2 and i.row_key=private.legacy_personal_key(to_jsonb(r))))',case when table_name like 'path_%' then 'private' else 'public' end,table_name) into unmapped using t,table_name;
 if unmapped then raise exception 'Legacy personal-data inventory incomplete: %',table_name;end if;
 end loop;
 select coalesce(jsonb_agg(to_jsonb(i)),'[]') into manifest from private.personal_data_inventory i where tenant_id=t and u=any(subjects);
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
 for x in select * from jsonb_to_recordset(manifest) as m(table_name text,row_key text) loop
 legacy_ids:=array_append(legacy_ids,x.row_key);
 case x.table_name
 when 'tasks' then update public.tasks set action='[erased]',owner='',notes='',source_record='{}',due_date=null where tenant_id=t and id::text=x.row_key;
 when 'employer_conversations' then update public.employer_conversations set contact='',relationship_kind='',status='Erased',notes='',next_action='',owner='',source_url=null,source_record='{}' where tenant_id=t and id::text=x.row_key;
 when 'job_needs' then update public.job_needs set title='[erased]',details='',source_record='{}' where tenant_id=t and id::text=x.row_key;
 when 'evidence_sources' then update public.evidence_sources set record_type='erased',source_url=null,notes='',record_id=null where tenant_id=t and id::text=x.row_key;
 when 'import_batches' then update public.import_batches set source_name='[erased]',source_data='{}',report='{}',imported_by=null,fingerprint=id::text where tenant_id=t and id::text=x.row_key;
 when 'import_records' then update public.import_records set collection='erased',original_record='{}',legacy_id=id::text,reason='',target_id=null where tenant_id=t and id::text=x.row_key;
 when 'legacy_identity_map' then delete from public.legacy_identity_map m where m.tenant_id=t and private.legacy_personal_key(to_jsonb(m))=x.row_key;
 when 'organizations' then update public.organizations set name='[erased]',description='',industry='',website=null,source_url=null where tenant_id=t and id::text=x.row_key;
 when 'job_postings' then update public.job_postings set title='[erased]',description='',industry='',employment_type='',experience_level='',application_url=null,application_instructions='',salary_range=null,status='archived',verified_at=null where tenant_id=t and id::text=x.row_key;
 when 'resources' then update public.resources set title='[erased]',description='',category='',url='https://example.invalid/erased',contact_url=null,source_url=null,status='archived',verified_at=null where tenant_id=t and id::text=x.row_key;
 when 'events' then update public.events set title='[erased]',description='',location='',audience='',registration_url='https://example.invalid/erased',status='archived',verified_at=null where tenant_id=t and id::text=x.row_key;

 when 'submissions' then update public.submissions set payload='{}',review_note='',dedupe_key=null where tenant_id=t and id::text=x.row_key;
 when 'introduction_requests' then update public.introduction_requests set message='' where tenant_id=t and id::text=x.row_key;
 when 'introductions' then update public.introductions set rationale='',sharing_scope='',permission_evidence='',introduced_at=null,candidate_approved_at=null,employer_approved_at=null,next_action='',status='closed' where tenant_id=t and id::text=x.row_key;
 when 'outcomes' then update public.outcomes set type='erased',source='',details='',verification='Reported',public_approved=false where tenant_id=t and id::text=x.row_key;
 when 'organization_locations' then delete from public.organization_locations where tenant_id=t and id::text=x.row_key;
 when 'job_locations' then delete from public.job_locations where tenant_id=t and id::text=x.row_key;
 when 'resource_eligibility' then update public.resource_eligibility set notes='' where tenant_id=t and id::text=x.row_key;
 when 'path_attempts' then update private.path_attempts set note='',opportunity='',state='erased',invalidated_at=coalesce(invalidated_at,now()) where tenant_id=t and id::text=x.row_key;
 when 'path_event_notes' then delete from private.path_event_notes where tenant_id=t and event_id::text=x.row_key;
 when 'path_relationships' then update private.path_relationships set context='[erased]',revoked_at=now() where tenant_id=t and id::text=x.row_key;
 else raise exception 'Unsupported inventory table';end case;
 end loop;
 -- Also remove subject attribution from manifests and residual audit identifiers.
 update private.personal_data_inventory set subjects=array_remove(subjects,u) where tenant_id=t and u=any(subjects);
 update public.audit_history set actor_id=null,record_id=null where tenant_id=t and (actor_id=u or record_id=any(legacy_ids));
 update private.path_deletion_requests set subject_id=null,status='completed',completed_at=now() where tenant_id=t and subject_id=u;
 return jsonb_build_object('status','completed','scope','current workspace','attempts_anonymized',cardinality(aids),'auth_identity','Shared sign-in identity is retained for other workspaces. Global account deletion requires a separate Auth-admin operation.');
end $$;


-- Never reuse a legacy classification after the underlying row changes.
create function private.invalidate_personal_inventory() returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from private.personal_data_inventory where tenant_id=old.tenant_id and table_name=tg_table_name and row_key=private.legacy_personal_key(to_jsonb(old));
 return case when tg_op='DELETE' then old else new end;
end $$;
revoke all on function private.invalidate_personal_inventory() from public,anon,authenticated;
do $$ declare tab text;begin
 foreach tab in array array['tasks','employer_conversations','job_needs','evidence_sources','import_batches','import_records','legacy_identity_map','organizations','job_postings','resources','events','submissions','introduction_requests','introductions','outcomes','organization_locations','job_locations','resource_eligibility','path_attempts','path_event_notes','path_relationships'] loop
 execute format('create trigger invalidate_privacy_manifest after update or delete on %I.%I for each row execute function private.invalidate_personal_inventory()',case when tab like 'path_%' then 'private' else 'public' end,tab);
 end loop;
end $$;
-- Existing account deletion intake now also enters the scoped fulfillment queue atomically.
create function private.queue_personal_deletion() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.kind='deletion' and new.user_id is not null then
 perform pg_advisory_xact_lock(hashtextextended(new.tenant_id::text,0));
 if not exists(select 1 from private.path_deletion_requests where tenant_id=new.tenant_id and subject_id=new.user_id and status='pending') then
 insert into private.path_deletion_requests(tenant_id,subject_id) values(new.tenant_id,new.user_id);
 end if;end if;return new;
end $$;
revoke all on function private.queue_personal_deletion() from public,anon,authenticated;
create trigger queue_privacy_fulfillment after insert on public.submissions for each row execute function private.queue_personal_deletion();
commit;
