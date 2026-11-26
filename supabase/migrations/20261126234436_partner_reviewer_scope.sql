begin;
create or replace function public.partner_case_action(command jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare t uuid:=private.current_tenant(); actor uuid:=private.path_uid(); op text:=command->>'operation';
 a private.partner_agreements; c private.partner_commitments; item private.partner_cases; j public.job_postings; ev public.events;
 req uuid; intake uuid; task uuid; intro uuid; kind text; wording text; staff boolean:=public.user_is_admin();
begin
 if t is null or not exists(select 1 from public.tenant_members where user_id=actor and tenant_id=t) then raise exception 'Program membership required' using errcode='42501';end if;
 if op in('interest','welcome') then
  if command->>'permission' is distinct from 'yes' then raise exception 'Specific permission required';end if;
  select * into strict a from private.partner_agreements where tenant_id=t and organization_id=(command->>'organization')::uuid and current_date between term_start and term_end and id=(command->>'agreement')::uuid;
  kind:=case op when 'interest' then 'talent' else 'welcome' end;
  select * into strict c from private.partner_commitments where id=(command->>'commitment')::uuid and agreement_id=a.id and pillar=case kind when 'talent' then 'Career opportunities' else 'New2KC welcome' end;
  perform pg_advisory_xact_lock(hashtextextended(c.id::text||actor::text,0));
  select * into item from private.partner_cases where commitment_id=c.id and participant=actor and partner_cases.kind=case op when 'interest' then 'talent' else 'welcome' end;
  if found then return item.id;end if;
  if kind='talent' then
   select * into strict j from public.job_postings where id=(command->>'job')::uuid and tenant_id=t and organization_id=a.organization_id and status='active' and expires_at>now()
   and exists(select 1 from private.commitment_assets l where l.commitment_id=c.id and l.asset_id=job_postings.id and l.kind='opportunity');
   wording:='Share my interest in this role with this employer for an introduction. No profile or contact details.';
   insert into public.introduction_requests(tenant_id,candidate_user_id,job_id,message) values(t,actor,j.id,wording) on conflict(candidate_user_id,job_id) do update set message=excluded.message returning id into req;
  else
   wording:='Allow the 2KC welcome team to follow up privately about this request. No employer disclosure.';
   insert into public.submissions(tenant_id,kind,user_id,payload) values(t,'candidate',actor,jsonb_build_object('source','authenticated welcome request','need',left(command->>'need',500),'permission',wording)) returning id into intake;
  end if;
  insert into public.tasks(tenant_id,action,owner,source_record) values(t,case op when 'interest' then 'Review permission for employer introduction' else 'Review newcomer welcome need' end,'2KC staff',jsonb_build_object('request',req,'intake',intake)) returning id into task;
  insert into private.partner_cases(commitment_id,participant,kind,request_id,intake_id,task_id,permission)
  values(c.id,actor,kind,req,intake,task,wording) returning id into item.id;return item.id;
 end if;
 select pc.* into strict item from private.partner_cases pc join private.partner_commitments co on co.id=pc.commitment_id join private.partner_agreements ag on ag.id=co.agreement_id where ag.tenant_id=t and pc.id=(command->>'case')::uuid for update of pc;
 select * into strict c from private.partner_commitments where id=item.commitment_id;
 select * into strict a from private.partner_agreements where id=c.agreement_id;
 if op='withdraw' and actor=item.participant then
  update private.partner_cases set state='withdrawn',revoked_at=coalesce(revoked_at,now()) where id=item.id;
  update public.tasks set status='Cancelled' where id=item.task_id;
 elsif item.revoked_at is not null then raise exception 'Permission withdrawn';
 elsif op='refer' and staff and (item.kind='welcome' or private.can_review('introductions')) and item.state='requested' then
  if item.kind='welcome' then
   select * into strict ev from public.events where id=(command->>'event')::uuid and tenant_id=t and status='published' and starts_at>now() and host_organization_id=a.organization_id;
  end if;
  update private.partner_cases set state='referred',event_id=ev.id where id=item.id;
  update public.tasks set action='Follow up on recipient response',due_date=current_date+7 where id=item.task_id;
 elsif op='accept' and item.kind='talent' and private.owns_organization(a.organization_id) and item.state='referred' then
  insert into public.introductions(tenant_id,request_id,candidate_user_id,organization_id,sharing_scope,candidate_approved_at,employer_approved_at,permission_evidence,introduced_at,status,next_action)
  values(t,item.request_id,item.participant,a.organization_id,item.permission,item.granted_at,now(),item.id::text,now(),'introduced','Ask participant about meeting') returning id into intro;
  update private.partner_cases set state='accepted',intro_id=intro,responded_at=now() where id=item.id;
 elsif op='complete' and item.participant=actor and ((item.kind='talent' and item.state='accepted') or (item.kind='welcome' and item.state='referred')) then
  insert into public.outcomes(tenant_id,introduction_id,type,occurred_on,verification,source,details)
  values(t,item.intro_id,case item.kind when 'talent' then 'Meeting completed' else 'Community connection completed' end,current_date,'Reported','Authenticated participant follow-up',item.id::text);
  update private.partner_cases set state='reported',completed_at=now() where id=item.id;
  update public.tasks set status='Done' where id=item.task_id;
 else raise exception 'Action unavailable' using errcode='42501';end if;return item.id;
end $$;
create or replace function public.partner_case_queue() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=private.path_uid();begin
 return (select coalesce(jsonb_agg(jsonb_build_object('id',pc.id,'kind',pc.kind,'state',pc.state,'employer',o.name,'deliverable',c.deliverable,'organization',o.id,'event',ev.title,
 'own',pc.participant=actor,'staff',(public.user_is_admin() and (pc.kind='welcome' or private.can_review('introductions'))),'recipient',private.owns_organization(o.id),
 'need',case when public.user_is_admin() or pc.participant=actor then s.payload->>'need' end,
 'permission',pc.permission,'role',j.title) order by pc.granted_at desc),'[]'::jsonb)
 from private.partner_cases pc join private.partner_commitments c on c.id=pc.commitment_id join private.partner_agreements a on a.id=c.agreement_id join public.organizations o on o.id=a.organization_id
 left join public.submissions s on s.id=pc.intake_id left join public.events ev on ev.id=pc.event_id left join public.introduction_requests ir on ir.id=pc.request_id left join public.job_postings j on j.id=ir.job_id
 where a.tenant_id=private.current_tenant() and ((public.user_is_admin() and (pc.kind='welcome' or private.can_review('introductions'))) or pc.participant=actor or (pc.kind='talent' and pc.revoked_at is null and pc.state in('referred','accepted') and private.owns_organization(o.id))));
end $$;
commit;
