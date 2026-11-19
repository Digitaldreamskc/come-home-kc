-- Verification updates are service messages, not optional marketing consent.
-- Preserve legacy opt-ins; do not backfill or fabricate consent. Delivery stays disabled.
begin;
create or replace function private.queue_employer_status_email() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient text;
begin
 if new.kind='employer' and new.status is distinct from old.status
 and ((new.payload->>'onboarding_version'='1' and new.payload->>'verification_contact_consent'='true')
 or (new.payload->>'onboarding_version'='2' and new.payload->>'verification_contact_notice_version'='2026-11-18')) then
  select email into recipient from auth.users where id=new.user_id and email_confirmed_at is not null;
  if recipient is not null then
   insert into private.employer_status_email_queue(tenant_id,submission_id,recipient_user_id,recipient_email,review_status)
   values(new.tenant_id,new.id,new.user_id,recipient,new.status);
  end if;
 end if;
 return new;
end $$;
revoke all on function private.queue_employer_status_email() from public,anon,authenticated;
commit;
