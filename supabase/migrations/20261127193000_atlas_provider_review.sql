create or replace function public.queue_atlas_provider_review(case_id uuid, provider_id text, provider_name text, provider_url text, rationale text)
returns uuid language plpgsql security definer set search_path='' as $$
declare t uuid:=private.current_tenant(); actor uuid:=private.path_uid(); result uuid;
begin
 if t is null or auth.uid() is null or public.user_is_admin() is not true then raise exception 'Staff required' using errcode='42501'; end if;
 if coalesce(length(provider_id),0) not between 1 and 120 or coalesce(length(provider_name),0) not between 1 and 200 or coalesce(length(rationale),0) not between 1 and 1000 or provider_url not like 'https://www.kcsourcelink.com/resource-navigator/detail/%' then raise exception 'Invalid research reference'; end if;
 perform 1 from private.partner_cases pc join private.partner_commitments c on c.id=pc.commitment_id join private.partner_agreements a on a.id=c.agreement_id where pc.id=case_id and a.tenant_id=t and pc.revoked_at is null and pc.state not in ('withdrawn','reported') and (pc.kind='welcome' or private.can_review('introductions')) for update of pc;
 if not found then raise exception 'Case unavailable'; end if;
 select id into result from public.tasks where tenant_id=t and status='Open' and source_record @> jsonb_build_object('case_id',case_id,'atlas_provider_id',provider_id,'kind','atlas_review') limit 1;
 if result is not null then return result; end if;
 insert into public.tasks(tenant_id,action,owner,due_date,notes,source_record) values(t,'Review Atlas provider fit: '||provider_name,'Jessica Powell',current_date+7,rationale||E'\nIdentity research only. Verify current eligibility, fit and permission before any introduction.',jsonb_build_object('case_id',case_id,'atlas_provider_id',provider_id,'source_url',provider_url,'kind','atlas_review','requested_by',actor)) returning id into result;
 return result;
end $$;
revoke all on function public.queue_atlas_provider_review(uuid,text,text,text,text) from public,anon;
grant execute on function public.queue_atlas_provider_review(uuid,text,text,text,text) to authenticated;
