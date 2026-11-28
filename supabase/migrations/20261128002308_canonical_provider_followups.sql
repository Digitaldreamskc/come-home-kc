create table private.case_provider_followups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  case_id uuid not null references private.partner_cases(id) on delete cascade,
  dataset text not null check (dataset in ('atlas','ecosystem')),
  provider_id text not null,
  organization_id uuid,
  source_url text not null,
  source_checked_at timestamptz not null default now(),
  rationale text not null,
  owner_id uuid references auth.users(id) on delete set null,
  next_action text not null,
  due_on date not null,
  stage text not null default 'identified' check (stage in ('identified','staff_review',
    'introduction_proposed','permission_received','introduction_made','meeting_occurred',
    'opportunity_developed','confirmed_outcome')),
  task_id uuid references public.tasks(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id,dataset,provider_id),
  foreign key (tenant_id,organization_id) references private.organization_identities(tenant_id,id)
);
create index case_provider_followup_owner on private.case_provider_followups(tenant_id,owner_id,due_on);
create table private.case_provider_followup_history (
  id bigint generated always as identity primary key,
  followup_id uuid not null references private.case_provider_followups(id) on delete cascade,
  stage text not null,
  owner_id uuid references auth.users(id) on delete set null,
  next_action text not null,
  due_on date not null,
  evidence text,
  recorded_by uuid references auth.users(id) on delete set null,
  recorded_at timestamptz not null default now()
);
create index case_provider_followup_history_parent on private.case_provider_followup_history(followup_id,id);
alter table private.case_provider_followups enable row level security;
alter table private.case_provider_followup_history enable row level security;
revoke all on private.case_provider_followups,private.case_provider_followup_history from public,anon,authenticated;

create function private.case_provider_workspace(case_ids uuid[]) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare t uuid:=private.current_tenant();
begin
  perform private.regional_staff();
  return jsonb_build_object(
    'owners',(select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'label',u.email) order by u.email),'[]')
      from public.user_roles r join auth.users u on u.id=r.user_id
      join public.tenant_members m on m.tenant_id=r.tenant_id and m.user_id=r.user_id
      where r.tenant_id=t and r.role='admin' and u.email_confirmed_at is not null
        and (u.banned_until is null or u.banned_until<now())),
    'followups',(select coalesce(jsonb_agg(to_jsonb(f)-'tenant_id' || jsonb_build_object(
      'history',(select coalesce(jsonb_agg(to_jsonb(h)-'followup_id' order by h.id),'[]')
                  from private.case_provider_followup_history h where h.followup_id=f.id)
      ) order by f.created_at desc),'[]')
      from private.case_provider_followups f
      join private.partner_cases pc on pc.id=f.case_id
      join private.partner_commitments c on c.id=pc.commitment_id
      join private.partner_agreements a on a.id=c.agreement_id
      where f.tenant_id=t and a.tenant_id=t and f.case_id=any(case_ids)
        and (pc.kind='welcome' or private.can_review('introductions')))
  );
end
$$;
create function public.case_provider_workspace(case_ids uuid[]) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.case_provider_workspace(case_ids)
$$;
revoke all on function private.case_provider_workspace(uuid[]), public.case_provider_workspace(uuid[]) from public,anon,authenticated;
grant execute on function private.case_provider_workspace(uuid[]), public.case_provider_workspace(uuid[]) to authenticated;

create function private.save_case_provider_followup(
  case_key uuid, followup_key uuid, dataset_key text, provider_key text, provider_source text,
  reason text, assigned_owner uuid, action_text text, due_date date, next_stage text, evidence_text text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  t uuid:=private.current_tenant();
  actor uuid:=private.regional_staff();
  item private.case_provider_followups;
  source text;
  owner_label text;
  organization_key uuid;
  task_key uuid;
  stages constant text[]:=array['identified','staff_review','introduction_proposed','permission_received',
    'introduction_made','meeting_occurred','opportunity_developed','confirmed_outcome'];
begin
  if coalesce(length(trim(action_text)),0) not between 1 and 500 or due_date is null
    or coalesce(length(evidence_text),0)>3000
    or next_stage is null or next_stage<>all(stages)
  then raise exception 'Invalid follow-up' using errcode='22023'; end if;

  select u.email into owner_label
  from public.user_roles r join auth.users u on u.id=r.user_id
  join public.tenant_members m on m.tenant_id=r.tenant_id and m.user_id=r.user_id
  where r.tenant_id=t and r.user_id=assigned_owner and r.role='admin' and u.email_confirmed_at is not null
    and (u.banned_until is null or u.banned_until<now());
  if owner_label is null then raise exception 'Owner unavailable' using errcode='42501'; end if;

  perform 1 from private.partner_cases pc
  join private.partner_commitments c on c.id=pc.commitment_id
  join private.partner_agreements a on a.id=c.agreement_id
  where pc.id=case_key and a.tenant_id=t and pc.revoked_at is null
    and pc.state not in ('withdrawn','reported') and (pc.kind='welcome' or private.can_review('introductions'))
  for update of pc;
  if not found then raise exception 'Case unavailable' using errcode='42501'; end if;

  if followup_key is null then
    if coalesce(length(trim(reason)),0) not between 1 and 1000 or next_stage<>'identified' then
      raise exception 'Start with a potential resource and a reason' using errcode='22023';
    end if;
    if dataset_key='ecosystem' then
      select p.source into source from public.ecosystem_providers p
      where p.id::text=provider_key and p.tenant_id=t and p.status='published';
    elsif dataset_key='atlas' and provider_key ~ '^ent_[a-zA-Z0-9_]{1,100}$' then
      -- The app's server verifies this external ID against the live published Atlas
      -- projection. This database owns authorization and the dated reference.
      source := provider_source;
    end if;
    if source is null or source !~ '^https://[^/[:space:]]+' or length(source)>1000 then
      raise exception 'Published provider unavailable' using errcode='22023';
    end if;
    select * into item from private.case_provider_followups f
      where f.case_id=case_key and f.dataset=dataset_key and f.provider_id=provider_key;
    if found then return item.id; end if;

    select r.organization_id into organization_key from private.organization_source_refs r
    where r.tenant_id=t and r.dataset=dataset_key and r.record_id=provider_key and r.review_status='verified';
    insert into private.case_provider_followups(tenant_id,case_id,dataset,provider_id,organization_id,
      source_url,rationale,owner_id,next_action,due_on,created_by)
    values(t,case_key,dataset_key,provider_key,organization_key,source,trim(reason),assigned_owner,trim(action_text),due_date,actor)
    returning * into item;
    insert into public.tasks(tenant_id,action,owner,due_date,source_record)
    values(t,trim(action_text),owner_label,due_date,jsonb_build_object(
      'kind','provider_followup','case_id',case_key,'followup_id',item.id,'dataset',dataset_key,'provider_id',provider_key))
    returning id into task_key;
    update private.case_provider_followups set task_id=task_key where id=item.id;
  else
    select * into item from private.case_provider_followups f
    where f.id=followup_key and f.case_id=case_key and f.tenant_id=t for update;
    if not found then raise exception 'Follow-up unavailable' using errcode='42501'; end if;
    if next_stage<>item.stage and (
      array_position(stages,next_stage)<>array_position(stages,item.stage)+1
      or coalesce(length(trim(evidence_text)),0)=0
    ) then raise exception 'Complete the next milestone and add evidence' using errcode='22023'; end if;

    update private.case_provider_followups set owner_id=assigned_owner,next_action=trim(action_text),
      due_on=due_date,stage=next_stage,updated_at=now() where id=item.id;
    update public.tasks set action=trim(action_text),owner=owner_label,due_date=save_case_provider_followup.due_date,
      status=case when next_stage='confirmed_outcome' then 'Done' else 'Open' end
    where id=item.task_id and tenant_id=t;
  end if;

  insert into private.case_provider_followup_history(followup_id,stage,owner_id,next_action,due_on,evidence,recorded_by)
  values(item.id,next_stage,assigned_owner,trim(action_text),due_date,nullif(trim(evidence_text),''),actor);
  return item.id;
end
$$;
create function public.save_case_provider_followup(
  case_key uuid, followup_key uuid, dataset_key text, provider_key text, provider_source text,
  reason text, assigned_owner uuid, action_text text, due_date date, next_stage text, evidence_text text
) returns uuid language sql security invoker set search_path = '' as $$
  select private.save_case_provider_followup(case_key,followup_key,dataset_key,provider_key,provider_source,
    reason,assigned_owner,action_text,due_date,next_stage,evidence_text)
$$;
revoke all on function private.save_case_provider_followup(uuid,uuid,text,text,text,text,uuid,text,date,text,text),
  public.save_case_provider_followup(uuid,uuid,text,text,text,text,uuid,text,date,text,text) from public,anon,authenticated;
grant execute on function private.save_case_provider_followup(uuid,uuid,text,text,text,text,uuid,text,date,text,text),
  public.save_case_provider_followup(uuid,uuid,text,text,text,text,uuid,text,date,text,text) to authenticated;

create function private.cancel_case_provider_tasks() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='DELETE' then
    update public.tasks set status='Cancelled',action='Archived case provider follow-up',
      notes='',source_record=jsonb_build_object('kind','archived_provider_followup')
    where status='Open' and source_record->>'case_id'=old.id::text and source_record->>'kind'='provider_followup';
    return old;
  end if;
  if new.state in ('withdrawn','reported') or new.revoked_at is not null then
    update public.tasks set status='Cancelled'
    where status='Open' and source_record->>'case_id'=new.id::text and source_record->>'kind'='provider_followup';
  end if;
  return new;
end
$$;
revoke all on function private.cancel_case_provider_tasks() from public,anon,authenticated;
create trigger cancel_case_provider_tasks before update of state,revoked_at or delete on private.partner_cases
for each row execute function private.cancel_case_provider_tasks();
