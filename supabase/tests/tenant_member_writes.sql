-- Rolled-back synthetic fixtures only. A member of one tenant must not create or
-- modify rows in another tenant by forging x-tenant-id or calling PostgREST/RPC directly.
begin;
select set_config('request.headers','{"x-tenant-id":"b2000000-0000-4000-8000-000000000001"}',true);
insert into public.tenants(id,slug,name) values
 ('a7e00000-0000-4000-8000-000000000002','synthetic-other','Synthetic other'),
 ('a7e00000-0000-4000-8000-000000000003','synthetic-third','Synthetic third'),
 ('a7e00000-0000-4000-8000-000000000004','synthetic-erasure','Synthetic erasure');
insert into public.tenant_regions values
 ('a7e00000-0000-4000-8000-000000000002','MO','Missouri'),
 ('a7e00000-0000-4000-8000-000000000002','KS','Kansas'),
 ('a7e00000-0000-4000-8000-000000000003','MO','Missouri'),
 ('a7e00000-0000-4000-8000-000000000003','KS','Kansas');
insert into private.relationship_modules(tenant_id,enabled) values
 ('a7e00000-0000-4000-8000-000000000002',true),
 ('a7e00000-0000-4000-8000-000000000003',true);
update private.relationship_modules set enabled=true where tenant_id='b2000000-0000-4000-8000-000000000001';
insert into private.program_modules(tenant_id,enabled) values
 ('b2000000-0000-4000-8000-000000000001',true),
 ('a7e00000-0000-4000-8000-000000000002',true);
insert into auth.users(id,email,email_confirmed_at) values
 ('a7e10000-0000-4000-8000-000000000001','member-a@example.test',now()),
 ('a7e10000-0000-4000-8000-000000000002','fresh-member@example.test',now()),
 ('a7e10000-0000-4000-8000-000000000003','dual-member@example.test',now()),
 ('a7e10000-0000-4000-8000-000000000004','conflict-member@example.test',now()),
 ('a7e10000-0000-4000-8000-000000000005','sole-member@example.test',now()),
 ('a7e10000-0000-4000-8000-000000000006','erasure-subject@example.test',now()),
 ('a7e10000-0000-4000-8000-000000000007','erasure-reviewer@example.test',now());
insert into auth.sessions(id,user_id,created_at,updated_at)
select replace(id::text,'a7e10000-','a7e60000-')::uuid, id, now(), now()
from auth.users where id::text like 'a7e10000-%';
insert into public.organizations(id,name,status,verification_status,verified_at) values
 ('a7e20000-0000-4000-8000-000000000001','Synthetic home employer','published','verified',now());
insert into public.organizations(tenant_id,id,name,status,verification_status,verified_at) values
 ('a7e00000-0000-4000-8000-000000000002','a7e20000-0000-4000-8000-000000000002','Synthetic other employer','published','verified',now());
insert into public.organization_members(organization_id,user_id,verified_at) values
 ('a7e20000-0000-4000-8000-000000000001','a7e10000-0000-4000-8000-000000000001',now());
insert into public.candidate_profiles(user_id,name,email) values
 ('a7e10000-0000-4000-8000-000000000001','Home person','member-a@example.test'),
 ('a7e10000-0000-4000-8000-000000000003','Dual person','dual-member@example.test');
insert into public.tenant_members(tenant_id,user_id) values
 ('a7e00000-0000-4000-8000-000000000002','a7e10000-0000-4000-8000-000000000003');
insert into private.path_people(tenant_id,id,user_id,display_name) values
 ('b2000000-0000-4000-8000-000000000001','a7e40000-0000-4000-8000-000000000001','a7e10000-0000-4000-8000-000000000001','Home person');
insert into public.job_postings(id,organization_id,title,description,application_url,status,verified_at,expires_at) values
 ('a7e30000-0000-4000-8000-000000000001','a7e20000-0000-4000-8000-000000000001','Home opening','Synthetic only','https://example.test/home','pending',now(),now()+interval '2 days');
insert into public.job_postings(tenant_id,id,organization_id,title,description,application_url,status,verified_at,expires_at) values
 ('a7e00000-0000-4000-8000-000000000002','a7e30000-0000-4000-8000-000000000002','a7e20000-0000-4000-8000-000000000002','Other opening','Synthetic only','https://example.test/other','pending',now(),now()+interval '2 days');
insert into public.job_locations(job_id,city,state,verified_at) values
 ('a7e30000-0000-4000-8000-000000000001','Synthetic City','KS',now());
insert into public.job_locations(tenant_id,job_id,city,state,verified_at) values
 ('a7e00000-0000-4000-8000-000000000002','a7e30000-0000-4000-8000-000000000002','Synthetic City','MO',now());
update public.job_postings set status='active' where id in ('a7e30000-0000-4000-8000-000000000001','a7e30000-0000-4000-8000-000000000002');
insert into private.program_catalog(tenant_id,id,kind,title,description,status) values
 ('a7e00000-0000-4000-8000-000000000002','a7e50000-0000-4000-8000-000000000002','opportunity','Synthetic seat','Synthetic activity','approved');
insert into public.candidate_profiles(tenant_id,user_id,name,email) values
 ('b2000000-0000-4000-8000-000000000001','a7e10000-0000-4000-8000-000000000004','Conflict home','conflict-member@example.test'),
 ('a7e00000-0000-4000-8000-000000000002','a7e10000-0000-4000-8000-000000000004','Conflict other','conflict-member@example.test'),
 ('b2000000-0000-4000-8000-000000000001','a7e10000-0000-4000-8000-000000000005','Sole person','sole-member@example.test');
insert into public.tenant_members(tenant_id,user_id) values
 ('a7e00000-0000-4000-8000-000000000004','a7e10000-0000-4000-8000-000000000006'),
 ('a7e00000-0000-4000-8000-000000000002','a7e10000-0000-4000-8000-000000000006');
insert into private.workflow_reviewers(tenant_id,user_id,workflow) values
 ('a7e00000-0000-4000-8000-000000000004','a7e10000-0000-4000-8000-000000000007','privacy');
insert into private.path_deletion_requests(tenant_id,id,subject_id) values
 ('a7e00000-0000-4000-8000-000000000004','a7e70000-0000-4000-8000-000000000001','a7e10000-0000-4000-8000-000000000006');

do $$ begin
 if not exists(select 1 from public.tenant_members where tenant_id='b2000000-0000-4000-8000-000000000001' and user_id='a7e10000-0000-4000-8000-000000000001') then raise exception 'Home membership was not recorded'; end if;
 if exists(select 1 from public.tenant_members where tenant_id='a7e00000-0000-4000-8000-000000000002' and user_id='a7e10000-0000-4000-8000-000000000001') then raise exception 'Member of home was recorded in the other tenant'; end if;
 if exists(select 1 from public.tenant_members where user_id='a7e10000-0000-4000-8000-000000000002') then raise exception 'Fresh account already has a membership'; end if;
end $$;

create function pg_temp.act(actor uuid, tenant uuid) returns void language plpgsql as $$
begin
 perform set_config('request.headers', jsonb_build_object('x-tenant-id', tenant)::text, true);
 perform set_config('request.jwt.claim.sub', actor::text, true);
 perform set_config('request.jwt.claim.role', 'authenticated', true);
 perform set_config('request.jwt.claims', jsonb_build_object('sub', actor, 'role', 'authenticated', 'session_id', replace(actor::text,'a7e10000-','a7e60000-'))::text, true);
end $$;
grant execute on function pg_temp.act(uuid, uuid) to authenticated;

set local role authenticated;
select pg_temp.act('a7e10000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001');
do $$ begin
 if private.current_tenant()<>'b2000000-0000-4000-8000-000000000001' then raise exception 'Matching membership did not select the home tenant'; end if;
 update public.candidate_profiles set name='Home person revised', opportunities_consent=true where user_id=auth.uid();
 if not found then raise exception 'Member could not revise their own profile'; end if;
 if not exists(select 1 from public.communications_consent where tenant_id='b2000000-0000-4000-8000-000000000001' and user_id=auth.uid() and purpose='professional_opportunities' and permitted) then raise exception 'Home consent was not recorded'; end if;
 if public.submit_intake('candidate','{"name":"Home intake","website_trap":""}') is null then raise exception 'Home intake failed'; end if;
 insert into public.introduction_requests(candidate_user_id,job_id,message,status) values(auth.uid(),'a7e30000-0000-4000-8000-000000000001','Home request','requested');
 insert into public.job_postings(organization_id,title,created_by) values('a7e20000-0000-4000-8000-000000000001','Home draft',auth.uid());
 if public.program_command('{"type":"profile","payload":{"name":"Home civic"}}') is null then raise exception 'Home activity profile failed'; end if;
 if public.path_request_deletion() is null then raise exception 'Home deletion request failed'; end if;
end $$;

select pg_temp.act('a7e10000-0000-4000-8000-000000000001','a7e00000-0000-4000-8000-000000000002');
do $$ begin
 if private.current_tenant() is not null then raise exception 'Forged header still selected a tenant'; end if;
 begin insert into public.candidate_profiles(tenant_id,user_id,name,email) values('a7e00000-0000-4000-8000-000000000002',auth.uid(),'Forged person','member-a@example.test'); raise exception 'Forged profile accepted'; exception when insufficient_privilege or not_null_violation or raise_exception then if sqlerrm='Forged profile accepted' then raise; end if; end;
 begin insert into public.candidate_profiles(user_id,name,email) values(auth.uid(),'Default forged','member-a@example.test'); raise exception 'Default forged profile accepted'; exception when insufficient_privilege or not_null_violation or raise_exception then if sqlerrm='Default forged profile accepted' then raise; end if; end;
 update public.candidate_profiles set name='Forged revision', introductions_consent=true where user_id=auth.uid();
 if found then raise exception 'Forged profile update wrote a row'; end if;
 begin insert into public.communications_consent(tenant_id,user_id,purpose,permitted,policy_version) values('a7e00000-0000-4000-8000-000000000002',auth.uid(),'professional_opportunities',true,'2026-11-17'); raise exception 'Forged consent accepted'; exception when insufficient_privilege or not_null_violation or raise_exception then if sqlerrm='Forged consent accepted' then raise; end if; end;
 begin insert into public.introduction_requests(tenant_id,candidate_user_id,job_id,message,status) values('a7e00000-0000-4000-8000-000000000002',auth.uid(),'a7e30000-0000-4000-8000-000000000002','Forged request','requested'); raise exception 'Forged introduction accepted'; exception when insufficient_privilege or foreign_key_violation or not_null_violation or raise_exception then if sqlerrm='Forged introduction accepted' then raise; end if; end;
 update public.introduction_requests set message='Forged revision' where candidate_user_id=auth.uid();
 if found then raise exception 'Forged introduction update wrote a row'; end if;
 begin insert into public.job_postings(tenant_id,organization_id,title,created_by) values('a7e00000-0000-4000-8000-000000000002','a7e20000-0000-4000-8000-000000000002','Forged opening',auth.uid()); raise exception 'Forged opportunity accepted'; exception when insufficient_privilege or foreign_key_violation or raise_exception then if sqlerrm='Forged opportunity accepted' then raise; end if; end;
 update public.job_postings set title='Stolen opening' where id='a7e30000-0000-4000-8000-000000000002';
 if found then raise exception 'Forged opportunity update wrote a row'; end if;
 begin perform public.submit_intake('candidate','{"name":"Forged intake","website_trap":""}'); raise exception 'Forged intake accepted'; exception when raise_exception then if sqlerrm='Forged intake accepted' then raise; end if; end;
 begin perform public.program_command('{"type":"profile","payload":{"name":"Forged civic"}}'); raise exception 'Forged activity profile accepted'; exception when insufficient_privilege or raise_exception then if sqlerrm='Forged activity profile accepted' then raise; end if; end;
 begin perform public.program_command('{"type":"interest","catalog_id":"a7e50000-0000-4000-8000-000000000002","consent":true,"note":"Forged interest"}'); raise exception 'Forged activity accepted'; exception when insufficient_privilege or raise_exception then if sqlerrm='Forged activity accepted' then raise; end if; end;
 begin perform public.path_command('{"type":"draft","first_edge":"a7e40000-0000-4000-8000-000000000001","second_edge":"a7e40000-0000-4000-8000-000000000001","note":"Forged"}'); raise exception 'Forged path accepted'; exception when insufficient_privilege or raise_exception then if sqlerrm='Forged path accepted' then raise; end if; end;
 begin perform public.path_request_deletion(); raise exception 'Forged deletion request accepted'; exception when raise_exception then if sqlerrm='Forged deletion request accepted' then raise; end if; end;
 begin insert into public.tenant_members(tenant_id,user_id) values('a7e00000-0000-4000-8000-000000000002',auth.uid()); raise exception 'Self-granted membership accepted'; exception when insufficient_privilege then null; end;
end $$;

select pg_temp.act('a7e10000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001');
do $$ begin
 update public.candidate_profiles set relocation_timeline='unchanged home' where user_id=auth.uid();
 if not found then raise exception 'Home write stopped working after a forged attempt'; end if;
end $$;

select pg_temp.act('a7e10000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000001');
do $$ begin
 if private.current_tenant() is not null then raise exception 'Fresh account already has tenant authority'; end if;
 begin insert into public.introduction_requests(tenant_id,candidate_user_id,job_id,message,status) values('b2000000-0000-4000-8000-000000000001',auth.uid(),'a7e30000-0000-4000-8000-000000000001','First action home','requested'); raise exception 'First introduction enrolled the home tenant'; exception when insufficient_privilege or foreign_key_violation or not_null_violation or raise_exception then if sqlerrm='First introduction enrolled the home tenant' then raise; end if; end;
end $$;
select pg_temp.act('a7e10000-0000-4000-8000-000000000002','a7e00000-0000-4000-8000-000000000002');
do $$ begin
 if private.current_tenant() is not null then raise exception 'Introduction request bound a second tenant'; end if;
 begin insert into public.introduction_requests(tenant_id,candidate_user_id,job_id,message,status) values('a7e00000-0000-4000-8000-000000000002',auth.uid(),'a7e30000-0000-4000-8000-000000000002','First action other','requested'); raise exception 'First introduction enrolled the other tenant'; exception when insufficient_privilege or foreign_key_violation or not_null_violation or raise_exception then if sqlerrm='First introduction enrolled the other tenant' then raise; end if; end;
end $$;
select pg_temp.act('a7e10000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000001');
do $$ begin
 if private.current_tenant() is not null then raise exception 'Introduction requests created a membership'; end if;
 if public.enroll_tenant()<>'b2000000-0000-4000-8000-000000000001' then raise exception 'Profile enrollment did not bind the deployment tenant'; end if;
 insert into public.candidate_profiles(user_id,name,email) values(auth.uid(),'First enrollment','fresh-member@example.test');
 insert into public.introduction_requests(candidate_user_id,job_id,message,status) values(auth.uid(),'a7e30000-0000-4000-8000-000000000001','Enrolled request','requested');
end $$;
select pg_temp.act('a7e10000-0000-4000-8000-000000000002','a7e00000-0000-4000-8000-000000000002');
do $$ begin
 if private.current_tenant() is not null then raise exception 'Enrolled account can still follow a forged header'; end if;
 begin perform public.enroll_tenant(); raise exception 'Second enrollment accepted'; exception when insufficient_privilege or raise_exception then if sqlerrm='Second enrollment accepted' then raise; end if; end;
 begin insert into public.introduction_requests(tenant_id,candidate_user_id,job_id,message,status) values('a7e00000-0000-4000-8000-000000000002',auth.uid(),'a7e30000-0000-4000-8000-000000000002','After enroll other','requested'); raise exception 'Introduction in a second tenant accepted'; exception when insufficient_privilege or foreign_key_violation or not_null_violation or raise_exception then if sqlerrm='Introduction in a second tenant accepted' then raise; end if; end;
end $$;

select pg_temp.act('a7e10000-0000-4000-8000-000000000003','a7e00000-0000-4000-8000-000000000002');
do $$ begin
 if private.current_tenant()<>'a7e00000-0000-4000-8000-000000000002' then raise exception 'Header did not select a granted membership'; end if;
 insert into public.candidate_profiles(user_id,name,email) values(auth.uid(),'Granted other profile','dual-member@example.test');
 if not exists(select 1 from public.candidate_profiles where tenant_id='a7e00000-0000-4000-8000-000000000002' and user_id=auth.uid() and name='Granted other profile') then raise exception 'Granted membership could not write'; end if;
end $$;
select pg_temp.act('a7e10000-0000-4000-8000-000000000003','a7e00000-0000-4000-8000-000000000003');
do $$ begin
 if private.current_tenant() is not null then raise exception 'Ungranted third tenant was selected'; end if;
 begin insert into public.candidate_profiles(tenant_id,user_id,name,email) values('a7e00000-0000-4000-8000-000000000003',auth.uid(),'Third tenant','dual-member@example.test'); raise exception 'Third tenant write accepted'; exception when insufficient_privilege or not_null_violation or raise_exception then if sqlerrm='Third tenant write accepted' then raise; end if; end;
end $$;
select pg_temp.act('a7e10000-0000-4000-8000-000000000007','a7e00000-0000-4000-8000-000000000004');
do $$ begin
 if public.path_erase('a7e70000-0000-4000-8000-000000000001')->>'status'<>'completed' then raise exception 'Workspace erasure did not complete'; end if;
end $$;
select pg_temp.act('a7e10000-0000-4000-8000-000000000006','a7e00000-0000-4000-8000-000000000004');
do $$ begin
 if private.current_tenant() is not null then raise exception 'Erased tenant is still authorized'; end if;
 begin insert into public.candidate_profiles(tenant_id,user_id,name,email) values('a7e00000-0000-4000-8000-000000000004',auth.uid(),'Erased rewrite','erasure-subject@example.test'); raise exception 'Erased tenant accepted a new profile'; exception when insufficient_privilege or not_null_violation or raise_exception then if sqlerrm='Erased tenant accepted a new profile' then raise; end if; end;
end $$;
select pg_temp.act('a7e10000-0000-4000-8000-000000000006','a7e00000-0000-4000-8000-000000000002');
do $$ begin
 if private.current_tenant()<>'a7e00000-0000-4000-8000-000000000002' then raise exception 'Erasure removed a different tenant'; end if;
 insert into public.candidate_profiles(user_id,name,email) values(auth.uid(),'Other tenant survived','erasure-subject@example.test');
end $$;

reset role;
-- Count forged rows as the table owner. The caller's RLS can hide a write that already landed.
do $$ begin
 if exists(select 1 from public.candidate_profiles where tenant_id='a7e00000-0000-4000-8000-000000000002' and user_id='a7e10000-0000-4000-8000-000000000001') then raise exception 'Forged profile row exists'; end if;
 if exists(select 1 from public.communications_consent where tenant_id='a7e00000-0000-4000-8000-000000000002' and user_id='a7e10000-0000-4000-8000-000000000001') then raise exception 'Forged consent row exists'; end if;
 if exists(select 1 from public.introduction_requests where tenant_id='a7e00000-0000-4000-8000-000000000002' and candidate_user_id='a7e10000-0000-4000-8000-000000000001') then raise exception 'Forged introduction row exists'; end if;
 if exists(select 1 from public.submissions where tenant_id='a7e00000-0000-4000-8000-000000000002' and user_id='a7e10000-0000-4000-8000-000000000001') then raise exception 'Forged intake row exists'; end if;
 if exists(select 1 from public.job_postings where tenant_id='a7e00000-0000-4000-8000-000000000002' and created_by='a7e10000-0000-4000-8000-000000000001') then raise exception 'Forged opportunity row exists'; end if;
 if exists(select 1 from private.program_profiles where tenant_id='a7e00000-0000-4000-8000-000000000002' and user_id='a7e10000-0000-4000-8000-000000000001') then raise exception 'Forged activity profile row exists'; end if;
 if exists(select 1 from private.program_records where tenant_id='a7e00000-0000-4000-8000-000000000002' and user_id='a7e10000-0000-4000-8000-000000000001') then raise exception 'Forged activity row exists'; end if;
 if exists(select 1 from private.path_requests where tenant_id='a7e00000-0000-4000-8000-000000000002') then raise exception 'Forged path row exists'; end if;
 if exists(select 1 from private.path_deletion_requests where tenant_id='a7e00000-0000-4000-8000-000000000002' and subject_id='a7e10000-0000-4000-8000-000000000001') then raise exception 'Forged deletion row exists'; end if;
 if exists(select 1 from public.tenant_members where tenant_id='a7e00000-0000-4000-8000-000000000002' and user_id='a7e10000-0000-4000-8000-000000000001') then raise exception 'Forged membership row exists'; end if;
 if (select name from public.candidate_profiles where tenant_id='b2000000-0000-4000-8000-000000000001' and user_id='a7e10000-0000-4000-8000-000000000001')<>'Home person revised' then raise exception 'Home profile was modified through the forged header'; end if;
 if (select title from public.job_postings where id='a7e30000-0000-4000-8000-000000000002')<>'Other opening' then raise exception 'Other tenant opportunity was modified'; end if;
 if exists(select 1 from public.candidate_profiles where tenant_id='a7e00000-0000-4000-8000-000000000003' and user_id='a7e10000-0000-4000-8000-000000000003') then raise exception 'Ungranted third tenant row exists'; end if;
 if exists(select 1 from public.candidate_profiles where tenant_id='a7e00000-0000-4000-8000-000000000002' and user_id='a7e10000-0000-4000-8000-000000000002') then raise exception 'Second enrollment row exists'; end if;
 if exists(select 1 from public.introduction_requests where candidate_user_id='a7e10000-0000-4000-8000-000000000002' and tenant_id<>'b2000000-0000-4000-8000-000000000001') then raise exception 'Introduction was stored outside the enrolled tenant'; end if;
 if not exists(select 1 from public.introduction_requests where tenant_id='b2000000-0000-4000-8000-000000000001' and candidate_user_id='a7e10000-0000-4000-8000-000000000002' and message='Enrolled request') then raise exception 'Enrolled introduction was not stored'; end if;
 if not exists(select 1 from public.tenant_members where tenant_id='b2000000-0000-4000-8000-000000000001' and user_id='a7e10000-0000-4000-8000-000000000002') then raise exception 'Enrollment did not record membership'; end if;
 if (select count(*) from public.tenant_members where user_id='a7e10000-0000-4000-8000-000000000002')<>1 then raise exception 'Enrollment recorded more than one tenant'; end if;
 if exists(select 1 from public.tenant_members where tenant_id='a7e00000-0000-4000-8000-000000000004' and user_id='a7e10000-0000-4000-8000-000000000006') then raise exception 'Erasure left the tenant membership'; end if;
 if not exists(select 1 from public.tenant_members where tenant_id='a7e00000-0000-4000-8000-000000000002' and user_id='a7e10000-0000-4000-8000-000000000006') then raise exception 'Erasure removed another tenant membership'; end if;
 if not exists(select 1 from public.tenant_members where tenant_id='a7e00000-0000-4000-8000-000000000004' and user_id='a7e10000-0000-4000-8000-000000000007') then raise exception 'Erasure removed the reviewer membership'; end if;
 delete from public.tenant_members where user_id in ('a7e10000-0000-4000-8000-000000000004','a7e10000-0000-4000-8000-000000000005');
 delete from private.tenant_membership_review where user_id in ('a7e10000-0000-4000-8000-000000000004','a7e10000-0000-4000-8000-000000000005');
 perform private.reconcile_tenant_memberships();
 if exists(select 1 from public.tenant_members where user_id='a7e10000-0000-4000-8000-000000000004') then raise exception 'Conflicting self-service records were granted'; end if;
 if (select count(*) from private.tenant_membership_review where user_id='a7e10000-0000-4000-8000-000000000004')<>2 then raise exception 'Conflicting tenants were not flagged for review'; end if;
 if not exists(select 1 from public.tenant_members where tenant_id='b2000000-0000-4000-8000-000000000001' and user_id='a7e10000-0000-4000-8000-000000000005') then raise exception 'Single original workspace was not granted'; end if;
 if (select count(*) from public.tenant_members where user_id='a7e10000-0000-4000-8000-000000000005')<>1 then raise exception 'Single original workspace granted an extra tenant'; end if;
 if exists(select 1 from private.tenant_membership_review where user_id='a7e10000-0000-4000-8000-000000000005') then raise exception 'Single original workspace was flagged'; end if;
end $$;
select 'PASS: member writes stay inside granted tenant memberships; forged headers and direct calls are rejected' as result;
rollback;
