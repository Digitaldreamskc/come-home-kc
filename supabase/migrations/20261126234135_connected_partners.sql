begin;
create table public.employer_stories (
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null default private.current_tenant(),
 organization_id uuid not null,title text not null check(length(trim(title)) between 1 and 180),
 body text not null check(length(trim(body)) between 1 and 8000), series text not null,
 published boolean not null default false,created_at timestamptz not null default now(),
 foreign key(tenant_id,organization_id) references public.organizations(tenant_id,id)
);
alter table public.employer_stories enable row level security;
revoke all on public.employer_stories from anon,authenticated;
grant select on public.employer_stories to anon,authenticated;
create policy published_stories on public.employer_stories for select using
 (tenant_id=private.current_tenant() and published and exists(select 1 from public.organizations o where o.id=organization_id and o.status='published' and o.verification_status='verified'));
create table private.commitment_assets (
 commitment_id uuid not null references private.partner_commitments, asset_id uuid not null, kind text not null check(kind in('story','opportunity','event','welcome','talent','atlas','recognition')),
 primary key(commitment_id,kind,asset_id)
);
create table private.partner_reports (
 id uuid primary key default gen_random_uuid(),agreement_id uuid not null references private.partner_agreements,
 period_start date not null, period_end date not null check(period_end>=period_start), approved_at timestamptz not null default now(),
 approved_by uuid not null references auth.users, payload jsonb not null, unique(agreement_id,period_start,period_end)
);
alter table private.commitment_assets enable row level security;
alter table private.partner_reports enable row level security;
revoke all on private.commitment_assets,private.partner_reports from public,anon,authenticated;
create table private.partner_research(commitment_id uuid primary key references private.partner_commitments, metric jsonb not null);
alter table private.partner_research enable row level security;
revoke all on private.partner_research from public,anon,authenticated;
create function public.configure_partner(command jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare
 t uuid:=private.current_tenant(); actor uuid:=private.path_uid(); a private.partner_agreements; c private.partner_commitments;
 op text:=command->>'operation'; o uuid; result uuid; asset uuid; k text; captured jsonb; pstart date; pend date;
begin
 if t is null or public.user_is_admin() is not true then raise exception 'Staff membership required' using errcode='42501';end if;
 if octet_length(command::text)>24000 then raise exception 'Input too large';end if;
 if op='agreement' then
  o:=nullif(command->>'organization','')::uuid;
  if not exists(select 1 from public.organizations where id=o and tenant_id=t and status='published' and verification_status='verified') then raise exception 'Select verified organization'; end if;
  insert into private.partner_agreements(tenant_id,organization_id,contracting_entity,term_start,term_end,value_usd,approved_scope,hiring_priorities,activation_plan,review_dates,synthetic)
  values(t,o,command->>'entity',(command->>'start')::date,(command->>'end')::date,(command->>'value')::numeric,command->>'scope',
  string_to_array(command->>'priorities',E'\n'),command->>'plan',array(select trim(x)::date from unnest(string_to_array(command->>'reviews',',')) x where trim(x)<>''),true) returning id into result;
  return result;
 end if;
 select * into strict a from private.partner_agreements where id=(command->>'agreement')::uuid and tenant_id=t for update;
 if op='commitment' then
  insert into private.partner_commitments(agreement_id,pillar,deliverable,owner_label,due_date)
  values(a.id,command->>'pillar',command->>'deliverable',command->>'owner',(command->>'due')::date) returning id into result;
 elsif op='asset' then
  select * into strict c from private.partner_commitments where id=(command->>'commitment')::uuid and agreement_id=a.id;
  k:=command->>'kind';
  if k='story' then
   insert into public.employer_stories(tenant_id,organization_id,title,body,series,published) values(t,a.organization_id,command->>'title',command->>'body',command->>'series',true) returning id into asset;
  elsif k='opportunity' then select id into strict asset from public.job_postings where id=(command->>'asset')::uuid and tenant_id=t and organization_id=a.organization_id and status='active';
  elsif k='event' then select id into strict asset from public.events where id=(command->>'asset')::uuid and tenant_id=t and host_organization_id=a.organization_id and status='published';
  elsif k='recognition' then select id into strict asset from public.organizations where id=a.organization_id and tenant_id=t and status='published';
  else raise exception 'Unknown asset';end if;
  insert into private.commitment_assets values(c.id,asset,k) on conflict do nothing;result:=asset;
 elsif op='research' then
  select * into strict c from private.partner_commitments where id=(command->>'commitment')::uuid and agreement_id=a.id and pillar='Regional intelligence';
  if command->'metric'->>'source_url' !~ '^https://' or coalesce(command->'metric'->>'metric_id','')='' then raise exception 'Source-linked Atlas metric required';end if;
  insert into private.partner_research(commitment_id,metric) values(c.id,command->'metric') on conflict(commitment_id) do update set metric=excluded.metric;result:=c.id;
 elsif op='report' then
  pstart:=(command->>'start')::date; pend:=(command->>'end')::date;
  if pstart<a.term_start or pend>a.term_end or pend<pstart then raise exception 'Select a reporting period within contract term';end if;
  select jsonb_build_object('deliveries',coalesce(jsonb_agg(jsonb_build_object('pillar',pillar,'deliverable',deliverable,'approvedAt',approved_at) order by approved_at),'[]'::jsonb),
   'research',coalesce((select jsonb_agg(r.metric) from private.partner_research r join private.partner_commitments rc on rc.id=r.commitment_id where rc.agreement_id=a.id and rc.state='approved' and (rc.approved_at at time zone 'UTC')::date between pstart and pend),'[]'::jsonb),'participantDisclosure','Withheld','attribution','Approved delivery only. No hiring or relocation attribution.') into captured
   from private.partner_commitments where agreement_id=a.id and state='approved' and (approved_at at time zone 'UTC')::date between pstart and pend;
  insert into private.partner_reports(agreement_id,period_start,period_end,approved_by,payload) values(a.id,pstart,pend,actor,captured) returning id into result;
 else raise exception 'Unknown operation';end if;return result;
end $$;
create function public.partner_publications(agreement uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a private.partner_agreements;begin
 perform private.path_uid();
 select * into strict a from private.partner_agreements where id=agreement and tenant_id=private.current_tenant() and (public.user_is_admin() or private.owns_organization(organization_id));
 return jsonb_build_object('organization',a.organization_id,
 'links',coalesce((select jsonb_agg(jsonb_build_object('kind',l.kind,'id',l.asset_id,'deliverable',c.deliverable)) from private.commitment_assets l join private.partner_commitments c on c.id=l.commitment_id where c.agreement_id=a.id and (public.user_is_admin() or c.state='approved') and l.kind in('story','opportunity','event','recognition')),'[]'::jsonb),
 'reports',coalesce((select jsonb_agg(jsonb_build_object('start',r.period_start,'end',r.period_end,'snapshot',r.payload) order by r.period_end desc) from private.partner_reports r where r.agreement_id=a.id),'[]'::jsonb));
end $$;
revoke all on function public.configure_partner(jsonb),public.partner_publications(uuid) from public,anon,authenticated;
grant execute on function public.configure_partner(jsonb),public.partner_publications(uuid) to authenticated;
commit;
