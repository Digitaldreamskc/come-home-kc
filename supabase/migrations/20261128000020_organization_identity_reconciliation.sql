-- Specialized rows remain in their source datasets. This registry records
-- reviewed identity links, aliases and evidence only.
create table private.organization_identities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  label text not null,
  aliases text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique(tenant_id,id)
);
create table private.organization_source_refs (
  tenant_id uuid not null references public.tenants(id),
  dataset text not null check (dataset in ('ecosystem','atlas','employer','jessicas_list')),
  record_id text not null,
  organization_id uuid not null,
  review_status text not null check (review_status in ('verified','possible','rejected')),
  source_url text not null check (source_url ~ '^https://'),
  rationale text not null,
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz not null default now(),
  primary key (tenant_id,dataset,record_id,organization_id),
  foreign key (tenant_id,organization_id) references private.organization_identities(tenant_id,id)
);
create unique index organization_one_verified_reference
  on private.organization_source_refs(tenant_id,dataset,record_id) where review_status='verified';
create index organization_reference_by_identity on private.organization_source_refs(tenant_id,organization_id);
create table private.organization_identity_reviews (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id),
  dataset text not null,
  record_id text not null,
  organization_id uuid not null,
  review_status text not null,
  source_url text not null,
  rationale text not null,
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz not null default now(),
  foreign key(tenant_id,dataset,record_id,organization_id)
    references private.organization_source_refs(tenant_id,dataset,record_id,organization_id)
);
alter table private.organization_identities enable row level security;
alter table private.organization_source_refs enable row level security;
alter table private.organization_identity_reviews enable row level security;
revoke all on private.organization_identities, private.organization_source_refs, private.organization_identity_reviews
  from public, anon, authenticated;

-- Seed only the documented AltCap identity. Other rows are candidates for review.
insert into private.organization_identities(id,tenant_id,label,aliases)
select p.id,p.tenant_id,'AltCap',array['AltCap']
from public.ecosystem_providers p join public.tenants t on t.id=p.tenant_id
where t.slug='back2kc' and p.name='AltCap' and private.organization_website_key(p.website)='altcap.org';
insert into private.organization_source_refs(tenant_id,dataset,record_id,organization_id,review_status,source_url,rationale)
select i.tenant_id,r.dataset,r.record_id,i.id,'verified','https://altcap.org/',
  'Official AltCap domain and name recorded on the published support profile and the Atlas community lender profile.'
from private.organization_identities i
cross join lateral (values ('ecosystem',i.id::text),('atlas','ent_e1b1e2b11431d4d5')) as r(dataset,record_id)
where i.label='AltCap';
insert into private.organization_identity_reviews(tenant_id,dataset,record_id,organization_id,review_status,source_url,rationale)
select tenant_id,dataset,record_id,organization_id,review_status,source_url,rationale
from private.organization_source_refs;

create or replace function private.ecosystem_candidates(t uuid, application jsonb)
returns setof public.ecosystem_providers language sql stable set search_path = '' as $$
  select p.* from public.ecosystem_providers p
  where p.tenant_id=t and (
    private.organization_name_key(p.name) in (
      private.organization_name_key(application->>'name'),
      private.organization_name_key(private.ecosystem_display_name(application))
    ) or private.organization_website_key(p.website) = private.organization_website_key(application->>'website')
    or exists (
      select 1 from private.organization_source_refs r
      join private.organization_identities i on i.tenant_id=r.tenant_id and i.id=r.organization_id
      cross join lateral unnest(i.aliases || i.label) as alias_names(value)
      where r.tenant_id=t and r.dataset='ecosystem' and r.record_id=p.id::text and r.review_status='verified'
      and private.organization_name_key(alias_names.value)=private.organization_name_key(application->>'name')
    )
  )
$$;

create function private.organization_identity_queue() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare t uuid := private.current_tenant();
begin
  perform private.regional_staff();
  return jsonb_build_object(
    'identities',(select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'label',i.label,'aliases',i.aliases)
                       order by lower(i.label),i.id),'[]')
                  from private.organization_identities i where i.tenant_id=t),
    'references',(select coalesce(jsonb_agg(to_jsonb(r)-'tenant_id' order by r.reviewed_at desc),'[]')
                  from private.organization_source_refs r where r.tenant_id=t),
    'history',(select coalesce(jsonb_agg(to_jsonb(h)-'tenant_id' order by h.id desc),'[]')
               from (select * from private.organization_identity_reviews where tenant_id=t order by id desc limit 100) h)
  );
end
$$;
create function public.organization_identity_queue() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.organization_identity_queue()
$$;
revoke all on function private.organization_identity_queue(),public.organization_identity_queue() from public, anon, authenticated;
grant execute on function private.organization_identity_queue(),public.organization_identity_queue() to authenticated;

create function private.review_organization_reference(
  dataset_key text, source_id text, identity_id uuid, label text, alias text,
  decision text, evidence text, notes text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  t uuid := private.current_tenant();
  actor uuid := private.regional_staff();
  identity uuid := identity_id;
begin
  if dataset_key is null or dataset_key not in ('ecosystem','atlas','employer','jessicas_list')
    or coalesce(length(source_id),0) not between 1 and 120
    or coalesce(length(trim(label)),0) not between 1 and 400
    or coalesce(length(trim(alias)),0) > 200
    or decision is null or decision not in ('verified','possible','rejected')
    or evidence is null or evidence !~ '^https://[^/[:space:]]+' or length(evidence)>500
    or coalesce(length(trim(notes)),0) not between 1 and 2000
    or (identity is null and decision <> 'verified')
  then raise exception 'Invalid identity review' using errcode='22023'; end if;

  if (dataset_key='ecosystem' and not exists(select 1 from public.ecosystem_providers p where p.tenant_id=t and p.id::text=source_id))
    or (dataset_key='employer' and not exists(select 1 from public.organizations o where o.tenant_id=t and o.id::text=source_id))
    or (dataset_key='atlas' and source_id !~ '^ent_[a-zA-Z0-9_]+$')
    or (dataset_key='jessicas_list' and source_id !~ '^[a-zA-Z0-9_-]+$')
  then raise exception 'Source record unavailable' using errcode='42501'; end if;

  if identity is null then
    insert into private.organization_identities(tenant_id,label) values(t,trim(label)) returning id into identity;
  end if;
  perform 1 from private.organization_identities where id=identity and tenant_id=t for update;
  if not found then raise exception 'Identity unavailable' using errcode='42501'; end if;

  insert into private.organization_source_refs(tenant_id,dataset,record_id,organization_id,review_status,source_url,rationale,reviewer_id)
  values(t,dataset_key,source_id,identity,decision,evidence,trim(notes),actor)
  on conflict (tenant_id,dataset,record_id,organization_id) do update set
    review_status=excluded.review_status,source_url=excluded.source_url,rationale=excluded.rationale,
    reviewer_id=excluded.reviewer_id,reviewed_at=now();
  if decision='verified' and nullif(trim(alias),'') is not null then
    update private.organization_identities i set aliases=array_append(i.aliases,trim(alias))
    where i.id=identity and not(trim(alias)=any(i.aliases));
  end if;
  insert into private.organization_identity_reviews(tenant_id,dataset,record_id,organization_id,review_status,source_url,rationale,reviewer_id)
  values(t,dataset_key,source_id,identity,decision,evidence,trim(notes),actor);
  return identity;
end
$$;
create function public.review_organization_reference(
  dataset_key text, source_id text, identity_id uuid, label text, alias text,
  decision text, evidence text, notes text
) returns uuid language sql security invoker set search_path = '' as $$
  select private.review_organization_reference(dataset_key,source_id,identity_id,label,alias,decision,evidence,notes)
$$;
revoke all on function private.review_organization_reference(text,text,uuid,text,text,text,text,text),
  public.review_organization_reference(text,text,uuid,text,text,text,text,text) from public, anon, authenticated;
grant execute on function private.review_organization_reference(text,text,uuid,text,text,text,text,text),
  public.review_organization_reference(text,text,uuid,text,text,text,text,text) to authenticated;
