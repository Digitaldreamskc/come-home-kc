-- Isolated validation project only. All synthetic fixtures roll back.
begin;
select set_config('request.headers','{"x-tenant-id":"b2000000-0000-4000-8000-000000000001"}',true);
insert into auth.users(id,email,email_confirmed_at) values('96000000-0000-4000-8000-000000000001','queue-test@example.test',now());
insert into public.submissions(id,user_id,kind,payload) values
 ('96000000-0000-4000-8000-000000000002','96000000-0000-4000-8000-000000000001','employer','{"onboarding_version":"1","verification_contact_consent":true,"email":"untrusted@example.test"}'),
 ('96000000-0000-4000-8000-000000000003','96000000-0000-4000-8000-000000000001','employer','{"onboarding_version":"1","verification_contact_consent":false}');
update public.submissions set status='approved' where id in ('96000000-0000-4000-8000-000000000002','96000000-0000-4000-8000-000000000003');
update public.submissions set status='approved' where id='96000000-0000-4000-8000-000000000002';
do $$ begin
 if (select count(*) from private.employer_status_email_queue where recipient_user_id='96000000-0000-4000-8000-000000000001')<>1 then raise exception 'Queue duplicate or missing consent gate';end if;
 if not exists(select 1 from private.employer_status_email_queue where recipient_user_id='96000000-0000-4000-8000-000000000001' and recipient_email='queue-test@example.test' and delivery_status='pending_configuration' and tenant_id='b2000000-0000-4000-8000-000000000001') then raise exception 'Untrusted recipient or incorrect tenant/delivery state';end if;
end $$;
set local role authenticated;
do $$ begin
 begin perform 1 from private.employer_status_email_queue;raise exception 'Queue readable by app users';exception when insufficient_privilege then null;end;
 begin insert into private.employer_status_email_queue(tenant_id,submission_id,recipient_user_id,recipient_email,review_status) values('b2000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000002','96000000-0000-4000-8000-000000000001','bad@example.test','approved');raise exception 'Queue writable by app users';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'employer email queue: consent, trusted recipient, deduplication and access denial passed' as result;
rollback;
