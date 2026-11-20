-- Founding partner inquiries and conversation statuses.
-- Does not edit hosted rows by itself; apply only on an isolated database.
-- $25,000 is not stored and is not a charge.
begin;

create function public.map_conversation_status(old_status text) returns text
language sql immutable strict parallel safe set search_path='' as $$
  select case old_status
    when 'Proposal' then 'Following up'
    when 'Committed' then 'Partner'
    when 'Active' then 'Partner'
    when 'Discovery' then 'Conversation'
    else old_status
  end
$$;
revoke all on function public.map_conversation_status(text) from public, anon;
grant execute on function public.map_conversation_status(text) to authenticated, service_role;

-- Status renames must not drop an operator's personal-data classification.
create temporary table founding_status_inventory as
select tenant_id, table_name, row_key, subjects, reviewed_at
from private.personal_data_inventory
where table_name = 'employer_conversations';

update public.employer_conversations
set status = public.map_conversation_status(status)
where status is distinct from public.map_conversation_status(status);

insert into private.personal_data_inventory(tenant_id, table_name, row_key, subjects, reviewed_at)
select tenant_id, table_name, row_key, subjects, reviewed_at
from founding_status_inventory
on conflict (tenant_id, table_name, row_key) do update
set subjects = excluded.subjects, reviewed_at = excluded.reviewed_at;

drop table founding_status_inventory;

alter table public.employer_conversations alter column organization_id drop not null;
alter table public.employer_conversations
  add column inquirer_name text not null default '',
  add column inquirer_email text not null default '',
  add column inquirer_role text not null default '',
  add column organization_name text not null default '',
  add column message text not null default '',
  add column contact_consent boolean not null default false;

create index employer_conversations_inquirer_email_idx
  on public.employer_conversations (tenant_id, lower(inquirer_email))
  where inquirer_email <> '';

-- Published research names are not public. Confirmed permission is a verified organization.
drop policy org_public on public.organizations;
create policy org_public on public.organizations for select to anon, authenticated
using (status = 'published' and verification_status = 'verified' and verified_at is not null);

drop policy locations_public on public.organization_locations;
create policy locations_public on public.organization_locations for select to anon, authenticated
using (
  verified_at is not null
  and exists (
    select 1 from public.organizations o
    where o.id = organization_id
      and o.tenant_id = organization_locations.tenant_id
      and o.status = 'published'
      and o.verification_status = 'verified'
      and o.verified_at is not null
  )
);

create function private.start_partner_conversation(
  p_name text, p_organization text, p_role text, p_email text, p_message text, p_consent boolean
) returns uuid
language plpgsql security definer set search_path='' as $$
declare t uuid := private.current_tenant(); item uuid; clean_email text;
begin
  if t is null then raise exception 'Tenant context required'; end if;
  if p_consent is not true then raise exception 'Contact consent required'; end if;
  if p_name is null or length(btrim(p_name)) < 1 or length(p_name) > 200 then raise exception 'Name required'; end if;
  if p_organization is null or length(btrim(p_organization)) < 1 or length(p_organization) > 200 then raise exception 'Organization required'; end if;
  if p_role is null or length(btrim(p_role)) < 1 or length(p_role) > 200 then raise exception 'Role required'; end if;
  clean_email := lower(btrim(coalesce(p_email, '')));
  if length(clean_email) > 254 or clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Email required'; end if;
  if p_message is null then p_message := ''; end if;
  if length(p_message) > 5000 then raise exception 'Message is too long'; end if;
  if not public.consume_rate_limit('partner:' || t::text || ':' || md5(clean_email), 5, 3600) then raise exception 'Please try again later'; end if;
  insert into public.employer_conversations(
    tenant_id, organization_id, contact, relationship_kind, status, notes,
    inquirer_name, inquirer_email, inquirer_role, organization_name, message, contact_consent, source_record
  ) values (
    t, null, clean_email, 'Founding partner inquiry', 'Prospect', '',
    btrim(p_name), clean_email, btrim(p_role), btrim(p_organization), btrim(p_message), true,
    jsonb_build_object('kind', 'founding_partner_inquiry', 'contact_consent', true, 'policy_version', '2026-11-19')
  ) returning id into item;
  return item;
end $$;
revoke all on function private.start_partner_conversation(text, text, text, text, text, boolean) from public;
grant execute on function private.start_partner_conversation(text, text, text, text, text, boolean) to anon, authenticated;

create function public.start_partner_conversation(
  p_name text, p_organization text, p_role text, p_email text, p_message text, p_consent boolean
) returns uuid
language sql security invoker set search_path='' as $$
  select private.start_partner_conversation(p_name, p_organization, p_role, p_email, p_message, p_consent)
$$;
revoke all on function public.start_partner_conversation(text, text, text, text, text, boolean) from public;
grant execute on function public.start_partner_conversation(text, text, text, text, text, boolean) to anon, authenticated;

-- Clear the new personal columns when a classified conversation is erased.
create or replace function private.path_erase_core(deletion_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare operator_id uuid:=private.path_uid();t uuid:=private.current_tenant();u uuid;p uuid;aids uuid[];legacy_ids text[];x record;table_name text;unmapped boolean;intro_ids uuid[];request_ids uuid[];manifest jsonb;
begin
 if not private.can_review('privacy') then raise exception 'Tenant privacy-review scope required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(t::text,0));
 select subject_id into u from private.path_deletion_requests where tenant_id=t and id=deletion_id and status='pending' for update;
 if u is null then raise exception 'Pending deletion request required';end if;
 if exists(select 1 from private.retention_holds where tenant_id=t and subject_id=u) then raise exception 'Retention hold requires a documented minimization decision before erasure';end if;
 lock table private.personal_data_inventory in share row exclusive mode;
 foreach table_name in array array['tasks','employer_conversations','job_needs','evidence_sources','import_batches','import_records','legacy_identity_map','organizations','job_postings','resources','events','submissions','introduction_requests','introductions','outcomes','organization_locations','job_locations','resource_eligibility','candidate_profiles','communications_consent','organization_members','user_roles'] loop
 execute format('lock table public.%I in share row exclusive mode',table_name);
 end loop;
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
 when 'employer_conversations' then update public.employer_conversations set contact='',relationship_kind='',status='Erased',notes='',next_action='',owner='',source_url=null,source_record='{}',inquirer_name='',inquirer_email='',inquirer_role='',organization_name='',message='',contact_consent=false where tenant_id=t and id::text=x.row_key;
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
 update private.personal_data_inventory set subjects=array_remove(subjects,u) where tenant_id=t and u=any(subjects);
 update public.audit_history set actor_id=null,record_id=null where tenant_id=t and (actor_id=u or record_id=any(legacy_ids));
 update private.path_deletion_requests set subject_id=null,status='completed',completed_at=now() where tenant_id=t and subject_id=u;
 return jsonb_build_object('status','completed','scope','current workspace','attempts_anonymized',cardinality(aids),'auth_identity','Shared sign-in identity is retained for other workspaces. Global account deletion requires a separate Auth-admin operation.');
end $$;
revoke all on function private.path_erase_core(uuid) from public, anon, authenticated;

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
  select email into account_email from auth.users where id = u;
  -- Link a founding-partner inquiry to this account when the email matches, then the core erasure clears its personal fields.
  insert into private.personal_data_inventory(tenant_id, table_name, row_key, subjects, reviewed_at)
  select c.tenant_id, 'employer_conversations', c.id::text, array[u], now()
  from public.employer_conversations c
  where c.tenant_id = t and account_email is not null and c.inquirer_email <> '' and lower(c.inquirer_email) = lower(account_email)
  on conflict (tenant_id, table_name, row_key) do update
  set subjects = (
    select coalesce(array_agg(distinct subject), '{}')
    from unnest(private.personal_data_inventory.subjects || excluded.subjects) as subject
  ), reviewed_at = now();
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
  delete from public.tenant_members where tenant_id = t and user_id = u;
  delete from private.tenant_membership_review where tenant_id = t and user_id = u;
  delete from private.tenant_invitations
  where tenant_id = t and (used_by = u or (account_email is not null and lower(email) = lower(account_email)));
  return result;
end $$;

commit;
