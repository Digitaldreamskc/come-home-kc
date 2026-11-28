-- Public submissions can create a pending record. The staff review writes both
-- the decision and its publication in the same transaction.
create or replace function private.regional_sector_options() returns text[]
language sql immutable set search_path = '' as $$
  select array[
    'Artificial Intelligence', 'Business Services', 'Consumer Discretionary',
    'Developer Tools', 'Diversified', 'Energy & Utilities',
    'Financial & Insurance Services', 'FinTech', 'Healthcare', 'Industrials',
    'Information Technology', 'Infrastructure', 'Machine Learning',
    'Raw Materials & Natural Resources', 'Real Estate', 'SaaS', 'Telecoms & Media'
  ]::text[]
$$;
revoke all on function private.regional_sector_options() from public, anon, authenticated;
grant execute on function private.regional_sector_options() to authenticated;

alter table public.ecosystem_providers
  add column sectors text[] not null default '{}',
  add column serves_all_industries boolean not null default false,
  add column industry_specialties text not null default '',
  add column business_types text[] not null default '{}',
  add column business_stages text[] not null default '{}',
  add column public_email text,
  add column public_phone text;
alter table public.ecosystem_providers
  add constraint ecosystem_sectors_known check (sectors <@ private.regional_sector_options());
update public.ecosystem_providers set serves_all_industries = industry = 'All industries',
  sectors = case industry when 'Technology' then array['Information Technology']
                         when 'Life sciences' then array['Healthcare'] else '{}'::text[] end;

alter table public.organizations
  add column sectors text[] not null default '{}';
alter table public.organizations
  add constraint organization_sectors_known check (sectors <@ private.regional_sector_options());
update public.organizations set sectors = array[s]
from unnest(private.regional_sector_options()) as s
where lower(trim(industry)) = lower(s);

create function private.organization_name_key(value text) returns text
language sql immutable strict set search_path = '' as $$
  select regexp_replace(lower(value), '[^[:alnum:]]', '', 'g')
$$;
create function private.organization_website_key(value text) returns text
language sql immutable strict set search_path = '' as $$
  select lower(regexp_replace(split_part(split_part(value,'?',1),'#',1), '^https://(www\.)?|/+$', '', 'gi'))
$$;
revoke all on function private.organization_name_key(text), private.organization_website_key(text) from public, anon, authenticated;

create table private.ecosystem_applications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  payload jsonb not null,
  fingerprint text not null,
  logo_mime text,
  logo_data bytea,
  submitted_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','revision','rejected','approved')),
  provider_id uuid references public.ecosystem_providers(id),
  check ((logo_mime is null) = (logo_data is null)),
  check (logo_mime in ('image/png','image/jpeg','image/gif') and octet_length(logo_data) <= 1048576),
  unique (tenant_id, fingerprint)
);
create index ecosystem_application_review_queue on private.ecosystem_applications(tenant_id, submitted_at desc, id);
create table private.ecosystem_application_decisions (
  id bigint generated always as identity primary key,
  application_id uuid not null references private.ecosystem_applications(id),
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz not null default now(),
  decision text not null check (decision in ('revision','rejected','approved')),
  notes text not null,
  provider_id uuid references public.ecosystem_providers(id),
  identity_decision text check (identity_decision in ('new','existing','distinct')),
  candidates uuid[] not null default '{}'
);
create index ecosystem_decision_application on private.ecosystem_application_decisions(application_id, id);
alter table private.ecosystem_applications enable row level security;
alter table private.ecosystem_application_decisions enable row level security;
revoke all on private.ecosystem_applications, private.ecosystem_application_decisions from public, anon, authenticated;

create function private.submit_ecosystem_application(
  application jsonb, mime text default null, logo text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  t uuid := private.current_tenant();
  bytes bytea;
begin
  if t is null then raise exception 'Directory unavailable' using errcode = '42501'; end if;
  if jsonb_typeof(application) is distinct from 'object' or octet_length(application::text) > 36000
    or coalesce(length(trim(application->>'name')),0) not between 1 and 200
    or coalesce(length(trim(application->>'programName')),0) > 150
    or coalesce(length(trim(application->>'quickDescription')),0) not between 1 and 250
    or coalesce(length(trim(application->>'geographicRestrictions')),0) not between 1 and 1500
    or coalesce(length(trim(application->>'contactEmail')),0) not between 3 and 254
    or application->>'website' is null or application->>'website' !~ '^https://[^/[:space:]]+'
    or length(application->>'website') > 500
    or application->'consent' is distinct from 'true'::jsonb
    or application->>'website_trap' is distinct from ''
    or jsonb_typeof(application->'sectors') is distinct from 'array'
    or jsonb_typeof(application->'selections') is distinct from 'object'
    or jsonb_typeof(application->'allIndustries') is distinct from 'boolean'
    or exists(select 1 from jsonb_array_elements_text(application->'sectors') s
              where s is null or s <> all(private.regional_sector_options()))
    or application->>'category' is null or application->>'category' not in (
      'Business advising','Mentoring','Accelerators & growth programs','Commercialization & prototyping',
      'Industry-specific support','Financing assistance','Workspace & facilities','Economic development','Other business support'
    )
  then raise exception 'Invalid application' using errcode = '22023'; end if;
  if logo is not null or mime is not null then
    if coalesce(length(logo),0) not between 4 and 1398104 or mime is null
      or mime not in ('image/png','image/jpeg','image/gif') then
      raise exception 'Invalid logo' using errcode = '22023';
    end if;
    bytes := decode(logo,'base64');
    if octet_length(bytes) > 1048576 or
      (mime='image/png' and substring(bytes from 1 for 8) <> decode('89504e470d0a1a0a','hex')) or
      (mime='image/jpeg' and substring(bytes from 1 for 3) <> decode('ffd8ff','hex')) or
      (mime='image/gif' and substring(bytes from 1 for 6) not in (convert_to('GIF87a','UTF8'),convert_to('GIF89a','UTF8')))
    then raise exception 'Invalid logo' using errcode = '22023'; end if;
  end if;

  insert into private.ecosystem_applications(tenant_id,payload,fingerprint,logo_mime,logo_data)
  values (t,application,md5(application::text || coalesce(logo,'')),mime,bytes)
  on conflict (tenant_id,fingerprint) do nothing;
end
$$;
create function public.submit_ecosystem_application(application jsonb, mime text default null, logo text default null)
returns void language sql security invoker set search_path = '' as $$
  select private.submit_ecosystem_application(application,mime,logo)
$$;
revoke all on function private.submit_ecosystem_application(jsonb,text,text),
  public.submit_ecosystem_application(jsonb,text,text) from public, anon, authenticated;
grant execute on function private.submit_ecosystem_application(jsonb,text,text),
  public.submit_ecosystem_application(jsonb,text,text) to anon, authenticated;

create or replace function private.regional_staff() returns uuid
language plpgsql stable security invoker set search_path = '' as $$
begin
  if private.current_tenant() is null or public.user_is_admin() is not true then
    raise exception 'Staff access required' using errcode = '42501';
  end if;
  return private.path_uid();
end
$$;
revoke all on function private.regional_staff() from public, anon, authenticated;

create function private.ecosystem_display_name(application jsonb) returns text
language sql immutable set search_path = '' as $$
  select concat_ws(' — ', application->>'name', nullif(application->>'programName',''))
$$;
create function private.ecosystem_candidates(t uuid, application jsonb)
returns setof public.ecosystem_providers language sql stable set search_path = '' as $$
  select p.* from public.ecosystem_providers p
  where p.tenant_id=t and (
    private.organization_name_key(p.name) in (
      private.organization_name_key(application->>'name'),
      private.organization_name_key(private.ecosystem_display_name(application))
    ) or private.organization_website_key(p.website) = private.organization_website_key(application->>'website')
  )
$$;
revoke all on function private.ecosystem_display_name(jsonb),
  private.ecosystem_candidates(uuid,jsonb) from public, anon, authenticated;

create function private.ecosystem_application_queue(application_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare t uuid := private.current_tenant();
begin
  perform private.regional_staff();
  return (
    select coalesce(jsonb_agg(
      jsonb_build_object('id',a.id,'submittedAt',a.submitted_at,'status',a.status,
        'name',private.ecosystem_display_name(a.payload),'providerId',a.provider_id)
      || case when application_id is not null then jsonb_build_object(
        'application',a.payload, 'logo', case when a.logo_data is not null then
          'data:' || a.logo_mime || ';base64,' || replace(encode(a.logo_data,'base64'),E'\n','') end,
        'candidates',(select coalesce(jsonb_agg(jsonb_build_object(
          'id',p.id,'name',p.name,'website',p.website,'status',p.status) order by p.name),'[]')
          from private.ecosystem_candidates(t,a.payload) p),
        'decisions',(select coalesce(jsonb_agg(to_jsonb(d) - 'application_id' order by d.id),'[]')
          from private.ecosystem_application_decisions d where d.application_id=a.id)
      ) else '{}'::jsonb end
      order by a.submitted_at desc, a.id),'[]')
    from (select * from private.ecosystem_applications
          where tenant_id=t and (application_id is null or id=application_id)
          order by submitted_at desc,id limit 100) a
  );
end
$$;
create function public.ecosystem_application_queue(application_id uuid default null)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select private.ecosystem_application_queue(application_id)
$$;
revoke all on function private.ecosystem_application_queue(uuid), public.ecosystem_application_queue(uuid) from public, anon, authenticated;
grant execute on function private.ecosystem_application_queue(uuid), public.ecosystem_application_queue(uuid) to authenticated;

create function private.review_ecosystem_application(
  application_id uuid, decision text, notes text, identity_decision text default null, target_provider uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  t uuid := private.current_tenant();
  actor uuid := private.regional_staff();
  item private.ecosystem_applications;
  p jsonb;
  candidates uuid[];
  provider uuid;
  display_name text;
  sector_list text[];
  services text[];
  types text[];
  stages text[];
  review_day date := (now() at time zone 'America/Chicago')::date;
begin
  if decision is null or decision not in ('revision','rejected','approved')
    or coalesce(length(trim(notes)),0) not between 1 and 2000 then
    raise exception 'Invalid review' using errcode = '22023';
  end if;

  -- Serialize approval/creation per tenant. Re-evaluate candidates under the lock.
  perform pg_advisory_xact_lock(hashtextextended('ecosystem providers:' || t::text,0));
  select * into item from private.ecosystem_applications a where a.id=application_id and a.tenant_id=t for update;
  if not found then raise exception 'Application unavailable' using errcode = '42501'; end if;
  if item.status not in ('pending','revision') then
    raise exception 'Application already decided' using errcode = '22023';
  end if;
  p := item.payload;
  display_name := private.ecosystem_display_name(p);
  select coalesce(array_agg(c.id order by c.id),'{}') into candidates from private.ecosystem_candidates(t,p) c;

  if decision = 'approved' then
    if identity_decision = 'existing' and target_provider = any(candidates) then
      provider := target_provider;
    elsif identity_decision = 'new' and cardinality(candidates)=0 and target_provider is null then
      provider := null;
    elsif identity_decision = 'distinct' and nullif(p->>'programName','') is not null
      and target_provider is null and not exists (
        select 1 from public.ecosystem_providers ep where ep.tenant_id=t
        and private.organization_name_key(ep.name)=private.organization_name_key(display_name)
      ) then
      provider := null;
    else
      raise exception 'Resolve the organization match before approval' using errcode = '22023';
    end if;

    select coalesce(array_agg(distinct s order by s),'{}') into sector_list from jsonb_array_elements_text(p->'sectors') s;
    select coalesce(array_agg(distinct split_part(key,'|',2) order by split_part(key,'|',2)),'{}')
      into services from jsonb_object_keys(p->'selections') key
      where split_part(key,'|',1) not in ('Business type','Business stage','Industry') and split_part(key,'|',2)<>'';
    select coalesce(array_agg(split_part(key,'|',2) order by key),'{}') into types from jsonb_object_keys(p->'selections') key
      where split_part(key,'|',1)='Business type';
    select coalesce(array_agg(split_part(key,'|',2) order by key),'{}') into stages from jsonb_object_keys(p->'selections') key
      where split_part(key,'|',1)='Business stage';

    if provider is null then
      insert into public.ecosystem_providers(
        tenant_id,name,category,description,website,stage,industry,needs,area,source,reviewed,status,
        sectors,serves_all_industries,industry_specialties,business_types,business_stages,public_email,public_phone
      ) values (
        t,display_name,p->>'category',p->>'quickDescription',p->>'website',p->>'primaryStage',
        case when (p->>'allIndustries')::boolean then 'All industries' else array_to_string(sector_list,', ') end,
        services,p->>'geographicRestrictions',p->>'website',review_day,'published',
        sector_list,(p->>'allIndustries')::boolean,coalesce(p->>'sectorSpecialties',''),types,stages,
        nullif(p->>'publicEmail',''),nullif(p->>'publicPhone','')
      ) returning id into provider;
    else
      update public.ecosystem_providers set
        name=display_name,category=p->>'category',description=p->>'quickDescription',website=p->>'website',
        stage=p->>'primaryStage',industry=case when (p->>'allIndustries')::boolean
          then 'All industries' else coalesce(nullif(industry,'All industries'),array_to_string(sector_list,', ')) end,
        needs=services,area=p->>'geographicRestrictions',source=p->>'website',reviewed=review_day,status='published',
        sectors=sector_list,serves_all_industries=(p->>'allIndustries')::boolean,
        industry_specialties=coalesce(nullif(p->>'sectorSpecialties',''),industry_specialties),
        business_types=types,business_stages=stages,public_email=nullif(p->>'publicEmail',''),public_phone=nullif(p->>'publicPhone',''),
        updated_at=now()
      where id=provider and tenant_id=t;
    end if;
  end if;

  insert into private.ecosystem_application_decisions(
    application_id,reviewer_id,decision,notes,provider_id,identity_decision,candidates
  ) values (application_id,actor,decision,trim(notes),provider,
            case when decision='approved' then identity_decision end,candidates);
  update private.ecosystem_applications set status=decision,provider_id=provider where id=item.id;
  return provider;
end
$$;
create function public.review_ecosystem_application(
  application_id uuid, decision text, notes text, identity_decision text default null, target_provider uuid default null
) returns uuid language sql security invoker set search_path = '' as $$
  select private.review_ecosystem_application(application_id,decision,notes,identity_decision,target_provider)
$$;
revoke all on function private.review_ecosystem_application(uuid,text,text,text,uuid),
  public.review_ecosystem_application(uuid,text,text,text,uuid) from public, anon, authenticated;
grant execute on function private.review_ecosystem_application(uuid,text,text,text,uuid),
  public.review_ecosystem_application(uuid,text,text,text,uuid) to authenticated;

-- Enforce normalized-name uniqueness across staff and application writes.
create unique index ecosystem_provider_normalized_name
  on public.ecosystem_providers(tenant_id, private.organization_name_key(name));
grant execute on function private.organization_name_key(text) to authenticated;

create function private.touch_ecosystem_provider() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end
$$;
revoke all on function private.touch_ecosystem_provider() from public, anon, authenticated;
create trigger touch_ecosystem_provider before update on public.ecosystem_providers
for each row execute function private.touch_ecosystem_provider();
