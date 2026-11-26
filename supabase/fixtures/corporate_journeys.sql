-- Fictional worked examples for the isolated M1 validation project only.
-- These two synthetic subjects have no password or sessions. No mail is sent.
begin;
do $$
declare
 t constant uuid := 'b2000000-0000-4000-8000-000000000001';
 org constant uuid := 'de270000-0000-4000-8000-000000000001';
 agreement constant uuid := 'de270000-0000-4000-8000-000000000002';
 candidate constant uuid := 'de270000-0000-4000-8000-000000000021';
 newcomer constant uuid := 'de270000-0000-4000-8000-000000000022';
 intro uuid; request_id uuid; welcome uuid; outcome uuid; resource uuid;
 day_offset integer; commitment uuid;
begin
 if not exists(select 1 from private.partner_agreements where id=agreement and synthetic and tenant_id=t) then raise exception 'Load synthetic agreement first';end if;
 if exists(select 1 from public.candidate_profiles where tenant_id=t and user_id=candidate) then return;end if;
 insert into auth.users(id,email,email_confirmed_at) values(candidate,'demo-returnee@example.invalid',now()),(newcomer,'demo-newcomer@example.invalid',now());
 insert into public.tenant_members(tenant_id,user_id) values(t,candidate),(t,newcomer);
 insert into public.candidate_profiles(tenant_id,user_id,name,email,relocation_timeline) values
 (t,candidate,'Demo returnee','demo-returnee@example.invalid','Considering a move'),
 (t,newcomer,'Demo newcomer','demo-newcomer@example.invalid','Recently relocated');
 insert into public.introduction_requests(tenant_id,candidate_user_id,job_id,message,status)
 values(t,candidate,'de270000-0000-4000-8000-000000000011','Fictional request following The Work Happening Here.','approved') returning id into request_id;
 insert into public.introductions(tenant_id,request_id,candidate_user_id,organization_id,rationale,sharing_scope,candidate_approved_at,employer_approved_at,permission_evidence,introduced_at,status,next_action)
 values(t,request_id,candidate,org,'Synthetic engineering interest','First name and role interest to the fictional employer only','2027-02-15','2027-02-16','Simulated approvals in the demonstration scenario','2027-02-17','meeting','Confirm whether the exploratory conversation progressed.') returning id into intro;
 insert into public.outcomes(tenant_id,introduction_id,type,occurred_on,verification,source,details)
 values(t,intro,'Exploratory meeting','2027-02-24','Reported','Fictional participant follow-up','Self-reported conversation. No application, interview or hire established.') returning id into outcome;
 insert into public.tasks(tenant_id,action,owner,due_date,source_record)
 values(t,'Follow up on the exploratory meeting','Welcome lead','2027-03-03',jsonb_build_object('introduction_id',intro,'outcome_id',outcome));
 insert into public.submissions(tenant_id,kind,user_id,payload)
 values(t,'candidate',newcomer,'{"source":"synthetic New2KC intake","need":"Meet neighbors","permission":"Private welcome follow-up only","employer_share":false}') returning id into welcome;
 select id into strict resource from public.resources where tenant_id=t and title='Neighborhood welcome circle (fictional)';
 select id into strict commitment from private.partner_commitments where agreement_id=agreement and pillar='New2KC welcome';
 foreach day_offset in array array[30,60,90] loop
 insert into public.tasks(tenant_id,action,owner,due_date,source_record)
 values(t,day_offset||'-day welcome check-in: community connections','Welcome lead',date '2027-01-10'+day_offset,
 jsonb_build_object('intake_id',welcome,'resource_id',resource,'commitment_id',commitment));
 end loop;
 insert into public.evidence_sources(tenant_id,record_type,record_id,notes,checked_at)
 values(t,'outcomes',outcome,'Synthetic scenario evidence. Attribution limited to facilitating a conversation.',now());
end $$;
commit;
