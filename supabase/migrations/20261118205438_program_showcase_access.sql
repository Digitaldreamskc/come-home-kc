begin;
create function public.showcase_access() returns boolean language sql security invoker set search_path='' as $$select private.can_review('showcase')$$;
revoke all on function public.showcase_access() from public,anon,authenticated;
grant execute on function public.showcase_access() to authenticated;
-- Enrich only the already-authorized projection; never enumerate hidden network rows.
alter function private.path_workspace() rename to path_workspace_core;
revoke all on function private.path_workspace_core() from public,anon,authenticated;
create function private.path_workspace() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb:=private.path_workspace_core();t uuid:=private.current_tenant();pid uuid:=private.path_person();routes jsonb;begin
 select coalesce(jsonb_agg(r || jsonb_build_object('verification','Confirmed by both people','confirmed_at',(select min(confirmed_at) from private.path_confirmations where tenant_id=t and relationship_id in ((r->>'first_edge')::uuid,(r->>'second_edge')::uuid)), 'availability',case when exists(select 1 from private.path_requests q join private.path_attempts a on a.tenant_id=t and a.request_id=q.id where q.tenant_id=t and q.requester_id=pid and q.first_edge=(r->>'first_edge')::uuid and q.second_edge=(r->>'second_edge')::uuid and a.invalidated_at is null and a.state not in ('completed')) then 'Already requested' else 'Available' end)),'[]'::jsonb) into routes from jsonb_array_elements(result->'routes') r;
 return jsonb_set(result,'{routes}',routes);end $$;
revoke all on function private.path_workspace() from public,anon,authenticated;
grant execute on function private.path_workspace() to authenticated;
commit;
