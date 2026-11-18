-- Operator-only seed. ONLY the isolated development project. No notifications.
-- Credentials are copied server-side from existing synthetic fixtures, never returned.
begin;
insert into public.tenants(id,slug,name) values('c3000000-0000-4000-8000-000000000001','kcnow-concept','KC Now concept demonstration') on conflict do nothing;
insert into private.relationship_modules(tenant_id,enabled,title) values('c3000000-0000-4000-8000-000000000001',true,'Your civic connections') on conflict do nothing;
insert into private.program_modules values('c3000000-0000-4000-8000-000000000001',true) on conflict do nothing;
do $$declare i int;newid uuid;oldid uuid;role_name text;begin
 for i in 1..4 loop
 newid:=('c3900000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;oldid:=('93000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;role_name:=(array['admin','candidate','employer','other'])[i];
 insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,confirmation_token,recovery_token,email_change_token_new,email_change,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
 select instance_id,newid,'authenticated','authenticated','kcnow-'||role_name||'@example.test',encrypted_password,now(),'','','','','{"provider":"email","providers":["email"]}', '{"synthetic":true}',now(),now() from auth.users where id=oldid on conflict(id) do nothing;
 insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at) values(newid::text,newid,jsonb_build_object('sub',newid::text,'email','kcnow-'||role_name||'@example.test','email_verified',true),'email',now(),now()) on conflict(provider_id,provider) do nothing;
 end loop;end $$;
insert into private.workflow_reviewers values
 ('c3000000-0000-4000-8000-000000000001','c3900000-0000-4000-8000-000000000001','introductions'),
 ('c3000000-0000-4000-8000-000000000001','c3900000-0000-4000-8000-000000000001','privacy'),
 ('c3000000-0000-4000-8000-000000000001','c3900000-0000-4000-8000-000000000001','programs'),
 ('b2000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001','showcase') on conflict do nothing;
insert into private.path_people(tenant_id,id,user_id,display_name) values
 ('c3000000-0000-4000-8000-000000000001','c3700000-0000-4000-8000-000000000001','c3900000-0000-4000-8000-000000000002','Alex Morgan'),
 ('c3000000-0000-4000-8000-000000000001','c3700000-0000-4000-8000-000000000002','c3900000-0000-4000-8000-000000000003','Jordan Rivera'),
 ('c3000000-0000-4000-8000-000000000001','c3700000-0000-4000-8000-000000000003','c3900000-0000-4000-8000-000000000004','Riley Brooks-Washington') on conflict do nothing;
insert into private.path_relationships(tenant_id,id,person_a,person_b,context) values
 ('c3000000-0000-4000-8000-000000000001','c3800000-0000-4000-8000-000000000001','c3700000-0000-4000-8000-000000000001','c3700000-0000-4000-8000-000000000002','Alex and Jordan, a neighborhood volunteer coordinator, participated in a fictional community learning circle.'),
 ('c3000000-0000-4000-8000-000000000001','c3800000-0000-4000-8000-000000000002','c3700000-0000-4000-8000-000000000002','c3700000-0000-4000-8000-000000000003','Jordan and Riley, a civic organization representative, served together on a fictional neighborhood advisory group.') on conflict do nothing;
insert into public.organizations(id,tenant_id,name,description,verification_status,verified_at) values('c3400000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','Riverbend Neighborhood Learning & Community Stewardship Council','Fictional organization for an isolated demonstration.','verified',now()) on conflict do nothing;
insert into public.organization_members(organization_id,tenant_id,user_id,verified_at) values('c3400000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001','c3900000-0000-4000-8000-000000000004',now()) on conflict do nothing;
insert into private.program_catalog(tenant_id,id,organization_id,kind,title,description,category,jurisdiction,requirements,process,status) values
 ('c3000000-0000-4000-8000-000000000001','c3500000-0000-4000-8000-000000000001','c3400000-0000-4000-8000-000000000001','learning','A first look at nonprofit board service','An introductory reading and reflection on stewardship, public trust, and asking useful questions.','Learning resource','Across the region','Boards steward an organization’s mission, resources, and accountability. Members should understand the mission, disclose conflicts, ask about financial oversight, and make time for preparation. Service is a responsibility, not an endorsement or credential.','Reflect on one community issue you care about. Write down two questions about a board’s expectations and the support offered to new members. Mark reviewed after reading; completion is your own report.','approved'),
 ('c3000000-0000-4000-8000-000000000001','c3500000-0000-4000-8000-000000000002','c3400000-0000-4000-8000-000000000001','opportunity','Neighborhood learning and community stewardship board member','Help a fictional neighborhood organization think through accessible learning and community participation.','Nonprofit board','Kansas City, Missouri','Interest in neighborhood learning. Willingness to listen, prepare for monthly meetings, and disclose conflicts. No prior board service required for this fictional example.','Express interest privately or request an introduction. A conversation would precede any application. No real applications are collected.','approved'),
 ('c3000000-0000-4000-8000-000000000001','c3500000-0000-4000-8000-000000000003','c3400000-0000-4000-8000-000000000001','opportunity','Community access advisory circle','Explore a fictional advisory role focused on welcoming community spaces.','Advisory committee','Kansas City, Kansas','Experience participating in community spaces and availability for a monthly listening session.','Prepare questions and explore a trusted introduction. This is a fictional opportunity, not a public appointment.','approved') on conflict do nothing;
commit;
