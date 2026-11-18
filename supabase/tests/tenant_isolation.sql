-- Run only in the dedicated validation project. Every fixture is rolled back.
begin;
select set_config('request.headers','{"x-tenant-id":"b2000000-0000-4000-8000-000000000001"}',true);
insert into public.tenants(id,slug,name) values('b2000000-0000-4000-8000-000000000002','synthetic-test','Synthetic test tenant') on conflict(id) do nothing;
insert into public.tenant_regions values('b2000000-0000-4000-8000-000000000002','MN','Minnesota') on conflict do nothing;
insert into auth.users(id,email,email_confirmed_at) values
 ('91000000-0000-4000-8000-000000000001','tenant-admin@example.test',now()),
 ('91000000-0000-4000-8000-000000000002','tenant-candidate@example.test',now()),
 ('91000000-0000-4000-8000-000000000003','tenant-employer@example.test',now());
insert into public.user_roles(user_id,role) values('91000000-0000-4000-8000-000000000001','admin');
insert into public.candidate_profiles(user_id,name,email) values('91000000-0000-4000-8000-000000000002','Private A','tenant-candidate@example.test');
insert into public.candidate_profiles(tenant_id,user_id,name,email) values('b2000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000002','Private B','tenant-candidate@example.test');
insert into public.organizations(id,name,status,verification_status,verified_at) values
 ('92000000-0000-4000-8000-000000000001','Synthetic A','published','verified',now()),
 ('92000000-0000-4000-8000-000000000003','Synthetic unowned A','draft','verified',now());
insert into public.organizations(tenant_id,id,name,status,verification_status,verified_at) values('b2000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000002','Synthetic B','draft','verified',now());
insert into public.organization_members(organization_id,user_id,verified_at) values('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000003',now());
set local role anon;
do $$ begin
 if exists(select 1 from public.candidate_profiles) then raise exception 'Anonymous candidate disclosure';end if;
 if exists(select 1 from public.organizations where tenant_id<>'b2000000-0000-4000-8000-000000000001') then raise exception 'Cross-tenant public disclosure';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.candidate_profiles)<>1 then raise exception 'Candidate owner isolation';end if;
 if exists(select 1 from public.candidate_profiles where name='Private B') then raise exception 'Cross-tenant same-user disclosure';end if;
 begin insert into public.tasks(tenant_id,action,owner) values('b2000000-0000-4000-8000-000000000002','Forgery','attacker');raise exception 'Forged tenant accepted';exception when insufficient_privilege then null;end;
 begin insert into public.user_roles(user_id,role) values(auth.uid(),'admin');raise exception 'Role escalation accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.candidate_profiles) then raise exception 'Employer candidate disclosure';end if;
 insert into public.job_postings(organization_id,title,created_by) values('92000000-0000-4000-8000-000000000001','Allowed synthetic draft',auth.uid());
 begin insert into public.job_postings(organization_id,title,created_by) values('92000000-0000-4000-8000-000000000003','Unowned',auth.uid());raise exception 'Employer ownership bypass';exception when insufficient_privilege then null;when raise_exception then if SQLERRM='Employer ownership bypass' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$ begin
 if not private.is_admin() then raise exception 'Tenant admin missing';end if;
 if (select count(*) from public.candidate_profiles)<>1 then raise exception 'Admin boundary leaked';end if;
 begin insert into public.job_needs(organization_id,title) values('92000000-0000-4000-8000-000000000002','Cross-tenant FK');raise exception 'Cross-tenant relationship accepted';exception when foreign_key_violation then null;end;
 begin update public.organizations set tenant_id='b2000000-0000-4000-8000-000000000002' where id='92000000-0000-4000-8000-000000000001';raise exception 'Ownership transfer accepted';exception when raise_exception then if SQLERRM='Ownership transfer accepted' then raise;end if;end;
end $$;
reset role;
select set_config('request.headers','{"x-tenant-id":"b2000000-0000-4000-8000-000000000002"}',true);
set local role authenticated;
do $$ begin
 if private.is_admin() then raise exception 'Forged header grants tenant admin';end if;
 if exists(select 1 from public.candidate_profiles) then raise exception 'Forged header leaks candidates';end if;
 if exists(select 1 from public.tasks) then raise exception 'Forged header leaks tasks';end if;
end $$;
reset role;
select set_config('request.headers','{}',true);
set local role anon;
do $$ begin if exists(select 1 from public.organizations) then raise exception 'Missing tenant fails open';end if;end $$;
reset role;
do $$ begin
 if exists(select 1 from pg_tables where schemaname='public' and not rowsecurity) then raise exception 'Exposed table lacks RLS';end if;
end $$;
select 'PASS: tenant boundary, forged headers, owner privacy, employer authorization, role escalation, composite relationships, immutable ownership, missing context and RLS inventory' as result;
rollback;
