-- Rolled-back synthetic fixtures only. A member of one tenant must not create or
-- modify rows in another tenant by forging x-tenant-id or calling PostgREST/RPC directly.
begin;
select set_config('request.headers','{"x-tenant-id":"b2000000-0000-4000-8000-000000000001"}',true);
insert into public.tenants(id,slug,name) values
 ('a7e00000-0000-4000-8000-000000000002','synthetic-other','Synthetic other'),
 ('a7e00000-0000-4000-8000-000000000003','synthetic-third','Synthetic third'),
 ('a7e00000-0000-4000-8000-000000000004','synthetic-erasure','Synthetic erasure'),
 ('c3000000-0000-4000-8000-000000000001','kcnow-concept','KC Now concept demonstration');
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
 ('a7e10000-0000-4000-8000-000000000007','erasure-reviewer@example.test',now()),
 ('a7e10000-0000-4000-8000-000000000008','operator-member@example.test',now()),
 ('a7e10000-0000-4000-8000-000000000009','invitee@example.test',now()),
 ('a7e10000-0000-4000-8000-000000000010','open-member@example.test',now()),
 ('a7e10000-0000-4000-8000-000000000011','kcnow-invitee@example.test',now());
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
 ('b2000000-0000-4000-8000-000000000001','a7e10000-0000-4000-8000-000000000005','Sole person','sole-member@example.test'),
 ('a7e00000-0000-4000-8000-000000000002','a7e10000-0000-4000-8000-000000000008','Operator extra profile','operator-member@example.test');
insert into public.user_roles(tenant_id,user_id,role) values('b2000000-0000-4000-8000-000000000001','a7e10000-0000-4000-8000-000000000008','admin');
insert into private.tenant_enrollment_policy(tenant_id,open_enrollment) values
 ('a7e00000-0000-4000-8000-000000000003',true);
insert into private.tenant_invitations(tenant_id,email,token_hash,expires_at) values
 ('a7e00000-0000-4000-8000-000000000002','invitee@example.test',md5('synthetic-valid-invite-token'),now()+interval '2 days'),
 ('a7e00000-0000-4000-8000-000000000002','invitee@example.test',md5('synthetic-expired-invite-token'),now()-interval '1 day'),
 ('b2000000-0000-4000-8000-000000000001','invitee@example.test',md5('synthetic-home-invite-token'),now()+interval '2 days');
insert into private.tenant_invitations(tenant_id,email,token_hash,expires_at,role,display_name)
select id,'kcnow-invitee@example.test',md5('synthetic-kcnow-invite-token'),now()+interval '2 days','participant','Invited civic person' from public.tenants where slug='kcnow-concept';
insert into private.tenant_invitations(tenant_id,email,token_hash,expires_at,role,display_name)
select id,'fresh-member@example.test',md5('synthetic-member-kcnow-invite'),now()+interval '2 days','participant','Fresh civic person' from public.tenants where slug='kcnow-concept';
insert into private.tenant_invitations(tenant_id,email,token_hash,expires_at)
values ('a7e00000-0000-4000-8000-000000000002','someone-else@example.test',md5('synthetic-wrong-email-invite-token'),now()+interval '2 days');
insert into private.relationship_modules(tenant_id,enabled,title)
select id,true,'Your civic connections' from public.tenants where slug='kcnow-concept';
insert into private.program_modules(tenant_id,enabled)
select id,true from public.tenants where slug='kcnow-concept';
insert into private.tenant_membership_review(user_id,tenant_id,sources) values
 ('a7e10000-0000-4000-8000-000000000006','a7e00000-0000-4000-8000-000000000004','{candidate_profiles}'),
 ('a7e10000-0000-4000-8000-000000000006','a7e00000-0000-4000-8000-000000000002','{candidate_profiles}');
insert into private.tenant_invitations(tenant_id,email,token_hash,expires_at) values
 ('a7e00000-0000-4000-8000-000000000004','erasure-subject@example.test',md5('synthetic-erasure-invite-token'),now()+interval '2 days'),
 ('a7e00000-0000-4000-8000-000000000002','erasure-subject@example.test',md5('synthetic-kept-invite-token'),now()+interval '2 days');
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
 if not exists(select 1 from private.tenant_enrollment_policy p join public.tenants t on t.id=p.tenant_id where t.slug='back2kc' and p.open_enrollment) then raise exception 'Back2KC self-enrollment is not open'; end if;
 if coalesce((select p.open_enrollment from private.tenant_enrollment_policy p join public.tenants t on t.id=p.tenant_id where t.slug='kcnow-concept'), false) then raise exception 'KC Now self-enrollment is open'; end if;
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
select pg_temp.act('a7e10000-0000-4000-8000-000000000002',(select id from public.tenants where slug='kcnow-concept'));
do $$ begin
 begin perform public.enroll_tenant(); raise exception 'Uninvited KC Now enrollment accepted'; exception when insufficient_privilege or raise_exception then if sqlerrm='Uninvited KC Now enrollment accepted' then raise; end if; end;
 begin perform public.program_workspace(); raise exception 'Uninvited civic workspace opened'; exception when insufficient_privilege or raise_exception then if sqlerrm='Uninvited civic workspace opened' then raise; end if; end;
 if private.current_tenant() is not null then raise exception 'Uninvited KC Now enrollment created authority'; end if;
end $$;
select pg_temp.act('a7e10000-0000-4000-8000-000000000002',(select id from public.tenants where slug='back2kc'));
do $$ begin
 if private.current_tenant() is not null then raise exception 'Introduction requests created a membership'; end if;
 if public.enroll_tenant()<>(select id from public.tenants where slug='back2kc') then raise exception 'Back2KC self-enrollment did not bind'; end if;
 insert into public.candidate_profiles(user_id,name,email) values(auth.uid(),'First enrollment','fresh-member@example.test');
 insert into public.introduction_requests(candidate_user_id,job_id,message,status) values(auth.uid(),'a7e30000-0000-4000-8000-000000000001','Enrolled request','requested');
end $$;
select pg_temp.act('a7e10000-0000-4000-8000-000000000002',(select id from public.tenants where slug='kcnow-concept'));
do $$ begin
 begin perform public.enroll_tenant(); raise exception 'Back2KC member self-enrolled in KC Now'; exception when insufficient_privilege or raise_exception then if sqlerrm='Back2KC member self-enrolled in KC Now' then raise; end if; end;
 if public.enroll_tenant('synthetic-member-kcnow-invite')<>(select id from public.tenants where slug='kcnow-concept') then raise exception 'Member invitation to KC Now was rejected'; end if;
 if private.path_person() is null then raise exception 'Civic invitation did not create a participant'; end if;
 if public.program_workspace() is null then raise exception 'Civic workspace rejected the invited member'; end if;
end $$;
select pg_temp.act('a7e10000-0000-4000-8000-000000000011',(select id from public.tenants where slug='kcnow-concept'));
do $$ begin
 if public.enroll_tenant('synthetic-kcnow-invite-token')<>(select id from public.tenants where slug='kcnow-concept') then raise exception 'KC Now invitation was rejected'; end if;
 if private.path_person() is null or public.program_workspace() is null then raise exception 'Invited account failed civic authorization'; end if;
 if public.program_command('{"type":"profile","payload":{"name":"Invited civic profile"}}') is null then raise exception 'Invited civic profile was not saved'; end if;
end $$;
select pg_temp.act('a7e10000-0000-4000-8000-000000000002','a7e00000-0000-4000-8000-000000000002');
do $$ begin
 if private.current_tenant() is not null then raise exception 'Enrolled account can still follow a forged header'; end if;
 begin perform public.enroll_tenant(); raise exception 'Second enrollment accepted'; exception when insufficient_privilege or raise_exception then if sqlerrm='Second enrollment accepted' then raise; end if; end;
 begin insert into public.introduction_requests(tenant_id,candidate_user_id,job_id,message,status) values('a7e00000-0000-4000-8000-000000000002',auth.uid(),'a7e30000-0000-4000-8000-000000000002','After enroll other','requested'); raise exception 'Introduction in a second tenant accepted'; exception when insufficient_privilege or foreign_key_violation or not_null_violation or raise_exception then if sqlerrm='Introduction in a second tenant accepted' then raise; end if; end;
end $$;
select pg_temp.act('a7e10000-0000-4000-8000-000000000002','a7e00000-0000-4000-8000-000000000003');
do $$ begin
 begin perform public.enroll_tenant(); raise exception 'Second open tenant accepted'; exception when insufficient_privilege or raise_exception then if sqlerrm='Second open tenant accepted' then raise; end if; end;
end $$;
select pg_temp.act('a7e10000-0000-4000-8000-000000000009','a7e00000-0000-4000-8000-000000000002');
do $$ begin
 begin perform public.enroll_tenant(); raise exception 'Closed tenant accepted uninvited enrollment'; exception when insufficient_privilege or raise_exception then if sqlerrm='Closed tenant accepted uninvited enrollment' then raise; end if; end;
 begin perform public.enroll_tenant('b2000000-0000-4000-8000-000000000001'); raise exception 'Caller tenant id was accepted as enrollment'; exception when insufficient_privilege or raise_exception then if sqlerrm='Caller tenant id was accepted as enrollment' then raise; end if; end;
 begin perform public.enroll_tenant('synthetic-home-invite-token'); raise exception 'Other-tenant invitation was accepted'; exception when insufficient_privilege or raise_exception then if sqlerrm='Other-tenant invitation was accepted' then raise; end if; end;
 begin perform public.enroll_tenant('synthetic-expired-invite-token'); raise exception 'Expired invitation was accepted'; exception when insufficient_privilege or raise_exception then if sqlerrm='Expired invitation was accepted' then raise; end if; end;
 begin perform public.enroll_tenant('synthetic-wrong-email-invite-token'); raise exception 'Wrong-email invitation was accepted'; exception when insufficient_privilege or raise_exception then if sqlerrm='Wrong-email invitation was accepted' then raise; end if; end;
 if public.enroll_tenant('synthetic-valid-invite-token')<>'a7e00000-0000-4000-8000-000000000002' then raise exception 'Valid invitation was rejected'; end if;
end $$;
select pg_temp.act('a7e10000-0000-4000-8000-000000000010','a7e00000-0000-4000-8000-000000000003');
do $$ begin
 if public.enroll_tenant()<>'a7e00000-0000-4000-8000-000000000003' then raise exception 'Open policy rejected self-enrollment'; end if;
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
 if (select count(*) from public.tenant_members where user_id='a7e10000-0000-4000-8000-000000000002')<>2 then raise exception 'Back2KC member did not keep both memberships'; end if;
 if not exists(select 1 from public.tenant_members m join public.tenants t on t.id=m.tenant_id where m.user_id='a7e10000-0000-4000-8000-000000000002' and t.slug='back2kc') then raise exception 'Back2KC profile enrollment was not recorded'; end if;
 if not exists(select 1 from public.tenant_members m join public.tenants t on t.id=m.tenant_id where m.user_id='a7e10000-0000-4000-8000-000000000002' and t.slug='kcnow-concept') then raise exception 'KC Now invitation did not add a membership'; end if;
 if not exists(select 1 from public.tenant_members m join public.tenants t on t.id=m.tenant_id where m.user_id='a7e10000-0000-4000-8000-000000000011' and t.slug='kcnow-concept') then raise exception 'Invited KC Now membership was not recorded'; end if;
 if (select count(*) from public.tenant_members where user_id='a7e10000-0000-4000-8000-000000000011')<>1 then raise exception 'KC Now invitation recorded an extra membership'; end if;
 if (select count(*) from public.tenant_members where user_id='a7e10000-0000-4000-8000-000000000009')<>1 then raise exception 'Invitation recorded more than one membership'; end if;
 if (select count(*) from public.tenant_members where user_id='a7e10000-0000-4000-8000-000000000010')<>1 then raise exception 'Open enrollment recorded more than one membership'; end if;
 if not exists(select 1 from private.tenant_invitations where token_hash=md5('synthetic-valid-invite-token') and used_by='a7e10000-0000-4000-8000-000000000009' and used_at is not null) then raise exception 'Invitation was not consumed'; end if;
 if exists(select 1 from public.tenant_members where tenant_id='a7e00000-0000-4000-8000-000000000004' and user_id='a7e10000-0000-4000-8000-000000000006') then raise exception 'Erasure left the tenant membership'; end if;
 if not exists(select 1 from public.tenant_members where tenant_id='a7e00000-0000-4000-8000-000000000002' and user_id='a7e10000-0000-4000-8000-000000000006') then raise exception 'Erasure removed another tenant membership'; end if;
 if not exists(select 1 from public.tenant_members where tenant_id='a7e00000-0000-4000-8000-000000000004' and user_id='a7e10000-0000-4000-8000-000000000007') then raise exception 'Erasure removed the reviewer membership'; end if;
 if exists(select 1 from private.tenant_membership_review where tenant_id='a7e00000-0000-4000-8000-000000000004' and user_id='a7e10000-0000-4000-8000-000000000006') then raise exception 'Erasure left a review row'; end if;
 if not exists(select 1 from private.tenant_membership_review where tenant_id='a7e00000-0000-4000-8000-000000000002' and user_id='a7e10000-0000-4000-8000-000000000006') then raise exception 'Erasure removed another tenant review row'; end if;
 if exists(select 1 from private.tenant_invitations where tenant_id='a7e00000-0000-4000-8000-000000000004' and email='erasure-subject@example.test') then raise exception 'Erasure left an invitation'; end if;
 if not exists(select 1 from private.tenant_invitations where tenant_id='a7e00000-0000-4000-8000-000000000002' and email='erasure-subject@example.test') then raise exception 'Erasure removed another tenant invitation'; end if;
 if exists(select 1 from public.tenant_members where user_id in ('a7e10000-0000-4000-8000-000000000004','a7e10000-0000-4000-8000-000000000005')) then raise exception 'Self-service profile created a membership'; end if;
 delete from private.tenant_membership_review where user_id in ('a7e10000-0000-4000-8000-000000000004','a7e10000-0000-4000-8000-000000000005','a7e10000-0000-4000-8000-000000000008');
 perform private.reconcile_tenant_memberships();
 if exists(select 1 from public.tenant_members where user_id='a7e10000-0000-4000-8000-000000000004') then raise exception 'Conflicting self-service records were granted'; end if;
 if (select count(*) from private.tenant_membership_review where user_id='a7e10000-0000-4000-8000-000000000004')<>2 then raise exception 'Conflicting tenants were not flagged for review'; end if;
 if exists(select 1 from public.tenant_members where user_id='a7e10000-0000-4000-8000-000000000005') then raise exception 'Single-tenant self-service account was granted'; end if;
 if not exists(select 1 from private.tenant_membership_review where user_id='a7e10000-0000-4000-8000-000000000005' and tenant_id='b2000000-0000-4000-8000-000000000001') then raise exception 'Single-tenant self-service account was not queued'; end if;
 if not exists(select 1 from public.tenant_members where tenant_id='b2000000-0000-4000-8000-000000000001' and user_id='a7e10000-0000-4000-8000-000000000008') then raise exception 'Operator evidence was not granted'; end if;
 if (select count(*) from public.tenant_members where user_id='a7e10000-0000-4000-8000-000000000008')<>1 then raise exception 'Operator evidence granted an extra tenant'; end if;
 if not exists(select 1 from private.tenant_membership_review where user_id='a7e10000-0000-4000-8000-000000000008' and tenant_id='a7e00000-0000-4000-8000-000000000002') then raise exception 'Untrusted extra tenant was not queued'; end if;
 if exists(select 1 from private.tenant_membership_review where user_id='a7e10000-0000-4000-8000-000000000008' and tenant_id='b2000000-0000-4000-8000-000000000001') then raise exception 'Operator tenant was queued as untrusted'; end if;
end $$;
reset role;
delete from public.tenant_members where user_id='a7e10000-0000-4000-8000-000000000009';
select pg_temp.act('a7e10000-0000-4000-8000-000000000009','a7e00000-0000-4000-8000-000000000002');
set local role authenticated;
do $$ begin
 begin perform public.enroll_tenant('synthetic-valid-invite-token'); raise exception 'Used invitation was accepted again'; exception when insufficient_privilege or raise_exception then if sqlerrm='Used invitation was accepted again' then raise; end if; end;
 if private.current_tenant() is not null then raise exception 'Reused invitation restored membership'; end if;
end $$;
reset role;
select 'PASS: member writes stay inside granted tenant memberships; forged headers and direct calls are rejected' as result;
rollback;
