begin;
-- Choices still change through the private profile; clients cannot forge audit provenance.
drop policy consent_own_insert on public.communications_consent;
revoke insert on public.communications_consent from authenticated;
create or replace function private.record_profile_consent() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' or old.opportunities_consent is distinct from new.opportunities_consent then
 insert into public.communications_consent(tenant_id,user_id,purpose,permitted,policy_version,source,recorded_at) values(new.tenant_id,new.user_id,'professional_opportunities',new.opportunities_consent,'2026-11-17','account',now());end if;
 if tg_op='INSERT' or old.introductions_consent is distinct from new.introductions_consent then
 insert into public.communications_consent(tenant_id,user_id,purpose,permitted,policy_version,source,recorded_at) values(new.tenant_id,new.user_id,'employer_introductions',new.introductions_consent,'2026-11-17','account',now());end if;
 return new;
end $$;
commit;
