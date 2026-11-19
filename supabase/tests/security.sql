-- Transactional tests with synthetic users. All test data is rolled back.
begin;
select set_config('request.headers','{"x-tenant-id":"b2000000-0000-4000-8000-000000000001"}',true);
insert into auth.users(id,email,email_confirmed_at) values
 ('11000000-0000-0000-0000-000000000001','synthetic-admin@example.test',now()),
 ('11000000-0000-0000-0000-000000000002','synthetic-talent@example.test',now()),
 ('11000000-0000-0000-0000-000000000003','synthetic-employer@example.test',now()),
 ('11000000-0000-0000-0000-000000000004','synthetic-other@example.test',now());
insert into public.user_roles(user_id,role) values('11000000-0000-0000-0000-000000000001','admin');
insert into public.organizations(id,name,status,verification_status,verified_at) values
 ('22000000-0000-0000-0000-000000000001','Synthetic verified employer','published','verified',now()),
 ('22000000-0000-0000-0000-000000000002','Synthetic private employer','draft','research',null);
insert into public.organization_members(organization_id,user_id,verified_at) values('22000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000003',now());
insert into public.candidate_profiles(user_id,name,email) values('11000000-0000-0000-0000-000000000002','Synthetic private person','synthetic-talent@example.test');
insert into public.tenant_members(tenant_id,user_id) values('b2000000-0000-4000-8000-000000000001','11000000-0000-0000-0000-000000000002');
insert into public.job_postings(id,organization_id,title,description,application_url,status,verified_at,expires_at) values
 ('33000000-0000-0000-0000-000000000001','22000000-0000-0000-0000-000000000001','Synthetic active job','Test only','https://example.test/apply','pending',now(),now()+interval '1 day'),
 ('33000000-0000-0000-0000-000000000002','22000000-0000-0000-0000-000000000001','Synthetic expired job','Test only','https://example.test/apply','pending',now(),now()-interval '1 day');
insert into public.job_locations(job_id,city,state,verified_at) values('33000000-0000-0000-0000-000000000001','Synthetic City','KS',now()),('33000000-0000-0000-0000-000000000002','Synthetic City','MO',now());
update public.job_postings set status='active' where id::text like '33000000%';
set local role anon;
do $$ begin
 if exists(select 1 from public.organizations where id='22000000-0000-0000-0000-000000000002') then raise exception 'Private employer leaked';end if;
 if (select count(*) from public.job_postings where id::text like '33000000%')<>1 then raise exception 'Expired listing visible';end if;
 begin if exists(select 1 from public.candidate_profiles) then raise exception 'Anonymous candidate data leaked';end if;exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000004',true);
set local role authenticated;
do $$ begin
 if public.user_is_admin() then raise exception 'Ordinary user elevated';end if;
 if exists(select 1 from public.candidate_profiles) then raise exception 'Other candidate leaked';end if;
 begin insert into public.user_roles(user_id,role) values(auth.uid(),'admin');raise exception 'User granted admin';exception when insufficient_privilege then null;end;
 begin insert into public.job_postings(organization_id,title,created_by) values('22000000-0000-0000-0000-000000000001','Unauthorized',auth.uid());raise exception 'Cross-org insert accepted';exception when insufficient_privilege or raise_exception then if SQLERRM='Cross-org insert accepted' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000002',true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.candidate_profiles)<>1 then raise exception 'Owner profile missing';end if;
 update public.candidate_profiles set opportunities_consent=true where user_id=auth.uid();
 if not exists(select 1 from public.communications_consent where user_id=auth.uid() and purpose='professional_opportunities' and permitted) then raise exception 'Consent history missing';end if;
 if public.submit_intake('candidate','{"name":"Synthetic Person","email":"spoof@example.test"}') is null then raise exception 'Submission failed';end if;
 if exists(select 1 from public.submissions where user_id=auth.uid() and payload->>'email'<>'synthetic-talent@example.test') then raise exception 'Client email trusted';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000003',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.candidate_profiles) then raise exception 'Employer can read candidates';end if;
 update public.job_postings set description='Edited employer description' where id='33000000-0000-0000-0000-000000000001';
 if not exists(select 1 from public.job_postings where id='33000000-0000-0000-0000-000000000001' and status='pending' and verified_at is null) then raise exception 'Edited job bypassed review';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$ begin
 if not public.user_is_admin() then raise exception 'Admin not recognized';end if;
 if exists(select 1 from public.candidate_profiles) then raise exception 'Ambient admin can read private profiles without scope';end if;
end $$;
reset role;
insert into private.workflow_reviewers values('b2000000-0000-4000-8000-000000000001','11000000-0000-0000-0000-000000000001','profiles');
set local role authenticated;
do $$begin if not exists(select 1 from public.candidate_profiles where user_id='11000000-0000-0000-0000-000000000002') then raise exception 'Scoped reviewer cannot read assigned tenant profile';end if;end $$;
reset role;
select 'PASS: anonymous boundaries, expiry, candidate ownership, role escalation, cross-org ownership, consent history, authenticated intake and admin access' as result;
rollback;
