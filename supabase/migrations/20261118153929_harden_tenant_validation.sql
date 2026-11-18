begin;
create or replace function private.validate_regions() returns trigger language plpgsql set search_path='' as $$
 declare codes text[]; field_name text; begin
 field_name:=case TG_TABLE_NAME when 'job_postings' then 'remote_eligible_states' when 'candidate_profiles' then 'preferred_states' else 'eligible_states' end;
 select coalesce(array_agg(value),'{}') into codes from jsonb_array_elements_text(coalesce(to_jsonb(new)->field_name,'[]'::jsonb));
 if exists(select 1 from unnest(codes) c where not exists(select 1 from public.tenant_regions r where r.tenant_id=new.tenant_id and r.code=c)) then raise exception 'Region outside tenant coverage';end if;return new;end $$;
alter table public.introduction_requests add constraint request_candidate_tenant foreign key(tenant_id,candidate_user_id) references public.candidate_profiles(tenant_id,user_id);
alter table public.introductions add constraint introduction_candidate_tenant foreign key(tenant_id,candidate_user_id) references public.candidate_profiles(tenant_id,user_id);
commit;
