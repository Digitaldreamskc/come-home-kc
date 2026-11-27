create or replace function public.queue_ecosystem_provider_review(case_id uuid, provider_id uuid, rationale text) returns uuid language plpgsql security definer set search_path='' as $$
declare t uuid:=private.current_tenant(); p public.ecosystem_providers; result uuid;
begin
 if t is null or auth.uid() is null or public.user_is_admin() is not true then raise exception 'Staff required'; end if;
 if coalesce(length(trim(rationale)),0) not between 1 and 1000 then raise exception 'Rationale required'; end if;
 select * into strict p from public.ecosystem_providers where id=provider_id and tenant_id=t and status='published';
 perform 1 from private.partner_cases pc join private.partner_commitments c on c.id=pc.commitment_id join private.partner_agreements a on a.id=c.agreement_id where pc.id=case_id and a.tenant_id=t and pc.revoked_at is null and pc.state not in ('withdrawn','reported') and (pc.kind='welcome' or private.can_review('introductions')) for update of pc;
 if not found then raise exception 'Case unavailable';end if;
 select id into result from public.tasks where tenant_id=t and status='Open' and source_record @> jsonb_build_object('case_id',case_id,'ecosystem_provider_id',provider_id,'kind','ecosystem_review') limit 1;
 if result is not null then return result;end if;
 insert into public.tasks(tenant_id,action,owner,due_date,notes,source_record) values(t,'Review support provider fit: '||p.name,'Jessica Powell',current_date+7,rationale,jsonb_build_object('case_id',case_id,'ecosystem_provider_id',provider_id,'kind','ecosystem_review','source_url',p.source,'requested_by',auth.uid())) returning id into result;return result;
end $$;
revoke all on function public.queue_ecosystem_provider_review(uuid,uuid,text) from public,anon;
grant execute on function public.queue_ecosystem_provider_review(uuid,uuid,text) to authenticated;
