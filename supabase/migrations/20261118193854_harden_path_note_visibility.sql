-- Keep request relationship rows inaccessible; evaluate note visibility in a narrow helper.
create function private.path_note_visible(eid bigint) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.path_event_notes n join private.path_events e on e.tenant_id=n.tenant_id and e.id=n.event_id join private.path_attempts a on a.tenant_id=e.tenant_id and a.id=e.attempt_id join private.path_requests r on r.tenant_id=a.tenant_id and r.id=a.request_id where n.tenant_id=private.current_tenant() and n.event_id=eid and private.path_can_read(a.id) and (n.audience='participants' or private.can_review('introductions') or r.requester_id=private.path_person()))
$$;
revoke all on function private.path_note_visible(bigint) from public,anon;
grant execute on function private.path_note_visible(bigint) to authenticated;
drop policy event_notes_read on private.path_event_notes;
create policy event_notes_read on private.path_event_notes for select to authenticated using(tenant_id=private.current_tenant() and private.path_note_visible(event_id));
