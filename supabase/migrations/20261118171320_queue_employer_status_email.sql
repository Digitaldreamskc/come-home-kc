begin;
-- No delivery worker is enabled. Status changes are durably queued until a
-- verified sender and transactional email provider are configured.
create table private.employer_status_email_queue (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.tenants(id),
 submission_id uuid not null references public.submissions(id) on delete cascade,
 recipient_user_id uuid not null references auth.users(id) on delete cascade,
 recipient_email text not null,
 review_status text not null check(review_status in ('pending','approved','rejected','archived')),
 delivery_status text not null default 'pending_configuration' check(delivery_status in ('pending_configuration','ready','sent','failed')),
 created_at timestamptz not null default now(),sent_at timestamptz,
 attempts integer not null default 0 check(attempts>=0)
);
alter table private.employer_status_email_queue enable row level security;
revoke all on private.employer_status_email_queue from public,anon,authenticated;
create or replace function private.queue_employer_status_email() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient text;
begin
 if new.kind='employer' and new.status is distinct from old.status
 and new.payload->>'onboarding_version'='1'
 and new.payload->>'verification_contact_consent'='true' then
  select email into recipient from auth.users where id=new.user_id and email_confirmed_at is not null;
  if recipient is not null then
   insert into private.employer_status_email_queue(tenant_id,submission_id,recipient_user_id,recipient_email,review_status)
   values(new.tenant_id,new.id,new.user_id,recipient,new.status);
  end if;
 end if;
 return new;
end $$;
revoke all on function private.queue_employer_status_email() from public,anon,authenticated;
create trigger employer_status_email after update of status on public.submissions
for each row execute function private.queue_employer_status_email();
commit;
