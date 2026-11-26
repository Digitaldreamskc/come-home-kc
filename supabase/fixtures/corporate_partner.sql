-- Run only on come-home-kc-m1-validation. All entries are fictional.
begin;
do $$
declare
 t constant uuid := 'b2000000-0000-4000-8000-000000000001';
 org constant uuid := 'de270000-0000-4000-8000-000000000001';
 agreement constant uuid := 'de270000-0000-4000-8000-000000000002';
 j record;
 resource_id uuid;
begin
 if exists(select 1 from private.partner_agreements where id=agreement) then return; end if;
 insert into public.organizations(id,tenant_id,name,description,industry,status,verification_status,verified_at)
 values(org,t,'Crossroads Instrument Works (fictional)','A demonstration employer designing instruments in Kansas City.','Advanced manufacturing','published','verified',now());
 insert into private.partner_agreements(id,tenant_id,organization_id,contracting_entity,term_start,term_end,value_usd,approved_scope,hiring_priorities,activation_plan,review_dates,renewal_status,synthetic)
 values(agreement,t,org,'Pending business decision · synthetic agreement','2027-01-01','2027-12-31',30000,
 'Illustrative annual scope across seven partnership services.',array['Engineering','Operations leadership'],
 'Introduce the employer in Q1, host an Inside KC visit, support incoming employees and review delivery quarterly.',
 array['2027-04-15','2027-07-15','2027-10-15','2027-12-15']::date[],'Review in Q4',true);
 insert into private.partner_commitments(agreement_id,pillar,deliverable,owner_label,due_date)
 select agreement,pillar,title,owner,due::date from (values
 ('Talent strategy','Approve hiring priorities and activation plan','Partnership lead','2027-01-20'),
 ('Career opportunities','Publish the approved engineering and operations roles','Marketplace editor','2027-02-05'),
 ('Employer storytelling','Publish The Work Happening Here employer feature','Editorial lead','2027-02-12'),
 ('Inside KC experiences','Host a workbench tour and record participation','Event lead','2027-03-12'),
 ('New2KC welcome','Coordinate relocation welcome check-ins','Welcome lead','2027-03-24'),
 ('Regional intelligence','Deliver the quarterly regional insights briefing','Research lead','2027-04-15'),
 ('Partner recognition','Review employer recognition placement','Partnership lead','2027-04-20')
 ) v(pillar,title,owner,due);
 for j in select * from (values
 ('de270000-0000-4000-8000-000000000011','Instrumentation engineer'),
 ('de270000-0000-4000-8000-000000000012','Operations lead'),
 ('de270000-0000-4000-8000-000000000013','Field support specialist')) v(id,title) loop
 insert into public.job_postings(id,tenant_id,organization_id,title,description,work_mode,status,verified_at,expires_at,application_url,remote_eligible_states)
 values(j.id::uuid,t,org,j.title||' (fictional)','Synthetic career opportunity for partnership review.','remote','active',now(),'2027-12-31','https://example.invalid/demo-role',array['MO','KS']);
 end loop;
 for j in select * from (values ('Neighborhood welcome circle','Community'),('KC newcomer walking group','Gatherings'),('Regional career peer group','Professional')) v(title,category) loop
 insert into public.resources(tenant_id,title,category,description,url,status,verified_at)
 values(t,j.title||' (fictional)',j.category,'Reviewed synthetic recommendation.','https://example.invalid/demo-resource','published',now()) returning id into resource_id;
 insert into public.resource_eligibility(tenant_id,resource_id,state,verified_at) values(t,resource_id,'MO',now());
 end loop;
 insert into public.events(tenant_id,title,description,starts_at,location,state,registration_url,host_organization_id,status,verified_at)
 values(t,'Inside KC workbench tour (fictional)','An illustrative employer-hosted experience.','2027-03-12T17:00:00Z','Demo workshop','MO','https://example.invalid/demo-tour',org,'published',now());
end $$;
commit;
