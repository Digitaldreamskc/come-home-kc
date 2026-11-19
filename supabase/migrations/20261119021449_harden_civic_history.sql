begin;
create or replace function private.program_capture_event() returns trigger language plpgsql security definer set search_path='' as $$
declare k text;begin
 -- A caller-set flag cannot suppress interest or decision auditing.
 if tg_table_name='program_catalog' and tg_op='UPDATE' and private.can_review('privacy') then
 if new.title='[erased]' and new.description='' and new.category='' and new.jurisdiction='' and new.requirements='' and new.process='' and new.deadline is null and new.status='declined' then return new;end if;
 end if;
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
commit;
