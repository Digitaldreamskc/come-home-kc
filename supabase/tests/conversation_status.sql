-- Rolls back. Confirms status mapping preserves unknown values and keeps inquiries operator-only.
begin;
select set_config('request.headers','{"x-tenant-id":"b2000000-0000-4000-8000-000000000001"}',true);
do $$ begin
  if public.map_conversation_status('Proposal') <> 'Following up' then raise exception 'Proposal did not map'; end if;
  if public.map_conversation_status('Committed') <> 'Partner' then raise exception 'Committed did not map'; end if;
  if public.map_conversation_status('Active') <> 'Partner' then raise exception 'Active did not map'; end if;
  if public.map_conversation_status('Discovery') <> 'Conversation' then raise exception 'Discovery did not map'; end if;
  if public.map_conversation_status('Prospect') <> 'Prospect' then raise exception 'Prospect changed'; end if;
  if public.map_conversation_status('Contacted') <> 'Contacted' then raise exception 'Contacted changed'; end if;
  if public.map_conversation_status('Conversation') <> 'Conversation' then raise exception 'Conversation changed'; end if;
  if public.map_conversation_status('Following up') <> 'Following up' then raise exception 'Following up changed'; end if;
  if public.map_conversation_status('Partner') <> 'Partner' then raise exception 'Partner changed'; end if;
  if public.map_conversation_status('Paused') <> 'Paused' then raise exception 'Paused changed'; end if;
  if public.map_conversation_status('Erased') <> 'Erased' then raise exception 'Erased status was rewritten'; end if;
  if public.map_conversation_status('PRIVATE_SENTINEL') <> 'PRIVATE_SENTINEL' then raise exception 'Unknown status was rewritten'; end if;
end $$;

do $$ declare item uuid; begin
  item := public.start_partner_conversation('Synthetic Partner','Synthetic Org','People lead','synthetic-partner@example.test','A note', true);
  if item is null then raise exception 'Inquiry was not stored'; end if;
  if not exists(select 1 from public.employer_conversations where id=item and status='Prospect' and organization_id is null and contact_consent and inquirer_email='synthetic-partner@example.test') then
    raise exception 'Inquiry was not an operator conversation';
  end if;
  begin
    perform public.start_partner_conversation('Synthetic Partner','Synthetic Org','People lead','synthetic-partner@example.test','A note', false);
    raise exception 'Missing consent was accepted';
  exception when others then
    if sqlerrm = 'Missing consent was accepted' then raise; end if;
  end;
end $$;

insert into public.organizations(name,status,verification_status) values('Synthetic research listing','published','research');
set local role anon;
do $$ begin
  begin
    if exists(select 1 from public.employer_conversations where inquirer_email='synthetic-partner@example.test') then
      raise exception 'Anonymous role can read a partner inquiry';
    end if;
  exception when insufficient_privilege then
    null;
  end;
  if exists(select 1 from public.organizations where status='published' and verification_status='research') then
    raise exception 'Anonymous role can read a published research employer';
  end if;
end $$;
rollback;
