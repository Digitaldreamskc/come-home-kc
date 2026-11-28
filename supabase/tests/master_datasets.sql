-- Run on Come Home KC M1 Validation. All fixture rows and audit effects roll back.
begin;
do $$
declare
  t uuid := (select id from public.tenants where slug='back2kc');
  foreign_tenant uuid := gen_random_uuid();
  staff uuid := gen_random_uuid();
  participant uuid := gen_random_uuid();
  employer uuid := gen_random_uuid();
  staff_session uuid := gen_random_uuid();
  participant_session uuid := gen_random_uuid();
  employer_session uuid := gen_random_uuid();
  application jsonb := '{
    "name":"Fictional Master Dataset Verification Lab",
    "category":"Mentoring","website":"https://example.com/fictional-master-validation",
    "firstName":"Fictional","lastName":"Tester","contactEmail":"private@example.invalid",
    "quickDescription":"Fictional rollback-only mentoring.",
    "geographicRestrictions":"KC metro","primaryStage":"Idea / inception",
    "allIndustries":false,"sectors":["SaaS","Business Services"],
    "selections":{"Business stage|Idea / inception":"offer","Business type|Main Street":"offer","Mentoring|Peer mentoring":"specialty"},
    "publicEmail":"published@example.invalid","consent":true,"website_trap":""
  }';
  new_app uuid; duplicate_app uuid; provider uuid;
  org uuid; agreement uuid; commitment uuid; case_id uuid; followup uuid; capital_followup uuid;
  staff_claim jsonb := jsonb_build_object('role','authenticated','sub',staff,'session_id',staff_session);
  subject record;
begin
  assert t is not null;
  insert into auth.users(id,email,email_confirmed_at) values
    (staff,'master-dataset-fictional-staff@example.invalid',now()),
    (participant,'master-dataset-fictional-participant@example.invalid',now()),
    (employer,'master-dataset-fictional-employer@example.invalid',now());
  insert into auth.sessions(id,user_id) values (staff_session,staff),(participant_session,participant),(employer_session,employer);
  insert into public.tenant_members(tenant_id,user_id) values (t,staff),(t,participant),(t,employer);
  insert into public.user_roles(tenant_id,user_id,role) values (t,staff,'admin');
  insert into public.tenants(id,slug,name,active) values (foreign_tenant,'fictional-master-dataset-verification','Fictional verification tenant',true);
  insert into public.organizations(tenant_id,name,status,verification_status)
  values(t,'Fictional Master Dataset Verification Employer','draft','research') returning id into org;
  insert into public.organization_members(tenant_id,organization_id,user_id) values(t,org,employer);
  insert into private.partner_agreements(tenant_id,organization_id,contracting_entity,term_start,term_end,
    value_usd,approved_scope,activation_plan,synthetic)
  values(t,org,'Fictional verification employer',current_date,current_date+30,0,'Test','Test',true)
  returning id into agreement;
  insert into private.partner_commitments(agreement_id,pillar,deliverable,owner_label,due_date)
  values(agreement,'New2KC welcome','Fictional verification case','Validation',current_date+5) returning id into commitment;
  insert into private.partner_cases(commitment_id,participant,kind,permission)
  values(commitment,participant,'welcome','Fictional private welcome follow-up permission') returning id into case_id;

  perform set_config('request.headers',jsonb_build_object('x-tenant-id',t)::text,true);
  perform set_config('request.jwt.claims','{"role":"anon"}',true);
  perform set_config('role','anon',true);
  assert (select count(*) from public.ecosystem_providers)=17;
  perform public.submit_ecosystem_application(application);
  perform public.submit_ecosystem_application(application);
  assert not exists(select 1 from public.ecosystem_providers p where p.name=application->>'name');
  begin perform public.ecosystem_application_queue(); raise exception 'Anonymous queue access';
  exception when insufficient_privilege then null; end;
  begin perform public.case_provider_workspace(array[case_id]); raise exception 'Anonymous case access';
  exception when insufficient_privilege then null; end;
  begin perform 1 from private.ecosystem_applications; raise exception 'Anonymous direct access';
  exception when insufficient_privilege then null; end;
  perform set_config('role','none',true);
  assert (select count(*) from private.ecosystem_applications a where a.payload->>'name'=application->>'name')=1;
  select a.id into strict new_app from private.ecosystem_applications a where a.payload->>'name'=application->>'name';

  for subject in select * from (values (participant, participant_session), (employer, employer_session)) as s(uid,sid)
  loop
    perform set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',subject.uid,'session_id',subject.sid)::text,true);
    perform set_config('role','authenticated',true);
    begin perform public.ecosystem_application_queue(new_app); raise exception 'Non-staff application access';
    exception when insufficient_privilege then null; end;
    begin perform public.review_ecosystem_application(new_app,'approved','Denied','new'); raise exception 'Non-staff approval';
    exception when insufficient_privilege then null; end;
    begin perform public.case_provider_workspace(array[case_id]); raise exception 'Non-staff case access';
    exception when insufficient_privilege then null; end;
    begin perform public.save_case_provider_followup(case_id,null,'atlas','ent_e1b1e2b11431d4d5',
      'https://altcap.org/','Denied',staff,'Denied',current_date,'identified',''); raise exception 'Non-staff follow-up';
    exception when insufficient_privilege then null; end;
    update public.ecosystem_providers set description='Denied';
    assert not found;
    perform set_config('role','none',true);
  end loop;

  perform set_config('request.jwt.claims',staff_claim::text,true);
  perform set_config('request.headers',jsonb_build_object('x-tenant-id',foreign_tenant)::text,true);
  perform set_config('role','authenticated',true);
  begin perform public.ecosystem_application_queue(new_app); raise exception 'Cross-tenant access';
  exception when insufficient_privilege then null; end;
  begin perform public.save_case_provider_followup(case_id,null,'atlas','ent_e1b1e2b11431d4d5',
    'https://altcap.org/','Denied',staff,'Denied',current_date,'identified',''); raise exception 'Cross-tenant follow-up';
  exception when insufficient_privilege then null; end;
  perform set_config('request.headers',jsonb_build_object('x-tenant-id',t)::text,true);
  assert public.ecosystem_application_queue(new_app)->0->>'status'='pending';

  perform public.review_ecosystem_application(new_app,'revision','Fictional request for clarification');
  assert public.ecosystem_application_queue(new_app)->0->>'status'='revision';
  provider := public.review_ecosystem_application(new_app,'approved','Verified fictional source','new');
  assert provider is not null;
  assert jsonb_array_length(public.ecosystem_application_queue(new_app)->0->'decisions')=2;
  update public.ecosystem_providers set description='Fictional staff edit' where id=provider;
  assert found;

  perform set_config('request.jwt.claims','{"role":"anon"}',true);
  perform set_config('role','anon',true);
  assert exists(select 1 from public.ecosystem_providers p where p.id=provider and p.status='published'
    and p.public_email='published@example.invalid' and p.sectors @> array['SaaS','Business Services']
    and to_jsonb(p)::text not like '%private@example.invalid%');
  perform public.submit_ecosystem_application(application || '{"quickDescription":"Second fictional version."}');
  perform set_config('role','none',true);
  select a.id into strict duplicate_app from private.ecosystem_applications a
  where a.payload->>'name'=application->>'name' and a.id<>new_app;
  perform set_config('request.jwt.claims',staff_claim::text,true);
  perform set_config('role','authenticated',true);
  begin perform public.review_ecosystem_application(duplicate_app,'approved','Blocked duplicate','new');
    raise exception 'Duplicate creation permitted';
  exception when invalid_parameter_value then null; end;
  assert public.ecosystem_application_queue(duplicate_app)->0->'candidates'->0->>'id'=provider::text;
  assert public.review_ecosystem_application(duplicate_app,'approved','Verified same fictional organization','existing',provider)=provider;

  followup := public.save_case_provider_followup(case_id,null,'ecosystem',provider::text,null,
    'Fictional fit',staff,'Review fictional mentoring',current_date+7,'identified','');
  assert followup = public.save_case_provider_followup(case_id,null,'ecosystem',provider::text,null,
    'Fictional retry',staff,'Review fictional mentoring',current_date+7,'identified','');
  capital_followup := public.save_case_provider_followup(case_id,null,'atlas','ent_e1b1e2b11431d4d5',
    'https://altcap.org/','Fictional fit',staff,'Review fictional capital',current_date+7,'identified','');
  assert capital_followup is not null;
  assert public.queue_ecosystem_provider_review(case_id,provider,'Check legacy review compatibility') is not null;
  begin perform public.save_case_provider_followup(case_id,followup,null,null,null,'',staff,
    'Skip milestones',current_date+7,'introduction_made','Fictional');
    raise exception 'Milestone bypass permitted';
  exception when invalid_parameter_value then null; end;
  perform public.save_case_provider_followup(case_id,followup,null,null,null,'',staff,'Review provider',
     current_date+7,'staff_review','Fictional review evidence');
  assert jsonb_array_length(public.case_provider_workspace(array[case_id])->'followups')=2;
  assert exists(select 1 from public.tasks task where task.source_record->>'followup_id'=followup::text
    and task.owner='master-dataset-fictional-staff@example.invalid' and task.action='Review provider'
    and task.due_date=current_date+7);
  perform set_config('role','none',true);
end $$;
rollback;
select 'Master dataset acceptance assertions passed in rolled-back fixtures' as result;
