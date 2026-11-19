begin;
do $$
declare uid uuid:=gen_random_uuid(); tid uuid; sid uuid:=gen_random_uuid(); n integer;
begin
 select id into tid from public.tenants where slug='back2kc';
 insert into auth.users(id,email,email_confirmed_at) values(uid,'service-notice-synthetic@example.test',now());
 insert into public.submissions(id,tenant_id,user_id,kind,payload,dedupe_key)
 values(sid,tid,uid,'employer','{"name":"Synthetic notice test","onboarding_version":"2","verification_contact_notice_version":"2026-11-18"}',sid::text);
 update public.submissions set status='approved' where id=sid;
 select count(*) into n from private.employer_status_email_queue where submission_id=sid and recipient_user_id=uid and tenant_id=tid and delivery_status='pending_configuration';
 if n<>1 then raise exception 'Service notice did not queue exactly one held notification';end if;
 update public.submissions set status='approved' where id=sid;
 if (select count(*) from private.employer_status_email_queue where submission_id=sid)<>1 then raise exception 'Duplicate status queued';end if;
 update public.submissions set payload='{"name":"Synthetic notice test","onboarding_version":"1","verification_contact_consent":false}',status='rejected' where id=sid;
 if (select count(*) from private.employer_status_email_queue where submission_id=sid)<>1 then raise exception 'Legacy refusal ignored';end if;
 update public.submissions set payload='{"name":"Synthetic notice test","onboarding_version":"1","verification_contact_consent":true}',status='approved' where id=sid;
 if (select count(*) from private.employer_status_email_queue where submission_id=sid)<>2 then raise exception 'Legacy opt-in not preserved';end if;
 if has_table_privilege('authenticated','private.employer_status_email_queue','SELECT') or has_table_privilege('anon','private.employer_status_email_queue','SELECT') then raise exception 'Queue exposed';end if;
 if not (select relrowsecurity from pg_class where oid='private.employer_status_email_queue'::regclass) then raise exception 'RLS disabled';end if;
end $$;
select 'PASS: service notice, legacy choices, duplicate prevention, held delivery, private queue RLS' as result;
rollback;
