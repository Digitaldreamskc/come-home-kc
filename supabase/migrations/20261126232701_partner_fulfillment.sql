begin;

create table private.partner_agreements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  organization_id uuid not null,
  contracting_entity text not null,
  term_start date not null,
  term_end date not null check (term_end >= term_start),
  value_usd numeric(12,2) not null check (value_usd >= 0),
  approved_scope text not null,
  hiring_priorities text[] not null default '{}',
  activation_plan text not null,
  review_dates date[] not null default '{}',
  renewal_status text not null default 'pending',
  synthetic boolean not null default false,
  foreign key (tenant_id, organization_id) references public.organizations(tenant_id,id)
);

create table private.partner_commitments (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references private.partner_agreements(id),
  pillar text not null check (pillar in ('Talent strategy','Career opportunities','Employer storytelling','Inside KC experiences','New2KC welcome','Regional intelligence','Partner recognition')),
  deliverable text not null,
  owner_label text not null,
  due_date date not null,
  state text not null default 'scheduled' check (state in ('scheduled','submitted','approved')),
  source_reference text,
  submitted_at timestamptz,
  approved_at timestamptz,
  submitted_by uuid references auth.users(id),
  approved_by uuid references auth.users(id)
);
create index partner_commitments_agreement on private.partner_commitments(agreement_id,due_date);
alter table private.partner_agreements enable row level security;
alter table private.partner_commitments enable row level security;
revoke all on private.partner_agreements, private.partner_commitments from public, anon, authenticated;

create function public.partner_workspace() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  tenant uuid := private.current_tenant();
  staff boolean := coalesce(public.user_is_admin(), false);
  payload jsonb;
begin
  perform private.path_uid();
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',a.id,'employer',o.name,'synthetic',a.synthetic,'contractingEntity',a.contracting_entity,
    'termStart',a.term_start,'termEnd',a.term_end,'value',a.value_usd,'scope',a.approved_scope,
    'priorities',a.hiring_priorities,'plan',a.activation_plan,'reviews',a.review_dates,'renewal',a.renewal_status,
    'commitments',(select coalesce(jsonb_agg(jsonb_build_object(
       'id',c.id,'pillar',c.pillar,'deliverable',c.deliverable,'due',c.due_date,
       'state',case when not staff and c.state='submitted' then 'scheduled' else c.state end,
       'owner',case when staff then c.owner_label end,
       'evidence',case when staff then c.source_reference end,'approvedAt',c.approved_at)
       order by c.due_date,c.id),'[]'::jsonb) from private.partner_commitments c where c.agreement_id=a.id)
    ) order by o.name,a.term_start),'[]'::jsonb) into payload
  from private.partner_agreements a join public.organizations o on o.id=a.organization_id and o.tenant_id=a.tenant_id
  where a.tenant_id=tenant and (staff or private.owns_organization(a.organization_id));
  return jsonb_build_object('staff',staff,'agreements',payload);
end $$;

create function public.partner_delivery(commitment uuid, action text, evidence text default null)
returns void language plpgsql security definer set search_path='' as $$
declare
  actor uuid := private.path_uid();
  item private.partner_commitments;
begin
  if public.user_is_admin() is not true then raise exception 'Staff access required' using errcode='42501'; end if;
  select c.* into item from private.partner_commitments c join private.partner_agreements a on a.id=c.agreement_id
  where c.id=commitment and a.tenant_id=private.current_tenant() for update of c;
  if not found then raise exception 'Commitment unavailable' using errcode='42501'; end if;
  if action='submit' and item.state='scheduled' and length(trim(evidence)) between 1 and 400 then
    update private.partner_commitments set state='submitted',source_reference=trim(evidence),submitted_by=actor,submitted_at=now() where id=item.id;
  elsif action='approve' and item.state='submitted' then
    update private.partner_commitments set state='approved',approved_by=actor,approved_at=now() where id=item.id;
  elsif action='approve' and item.state='approved' then return;
  elsif action='submit' and item.state='submitted' and item.source_reference=trim(evidence) then return;
  else raise exception 'Invalid delivery transition or missing evidence'; end if;
end $$;
revoke all on function public.partner_workspace(),public.partner_delivery(uuid,text,text) from public,anon,authenticated;
grant execute on function public.partner_workspace(),public.partner_delivery(uuid,text,text) to authenticated;
commit;
