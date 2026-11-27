begin;
-- Keep the existing portal and staff review queue in sync with the case that owns
-- the transition. Preserve outcomes as participant-reported observations.
create function private.sync_case_source_state() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.request_id is not null then
  update public.introduction_requests set status=case new.state when 'requested' then 'requested' when 'referred' then 'reviewing' when 'accepted' then 'approved' when 'reported' then 'closed' when 'withdrawn' then 'closed' end where id=new.request_id;
 end if;
 if new.intro_id is not null and new.state in('reported','withdrawn') then
  update public.introductions set status=case new.state when 'reported' then 'meeting' else 'closed' end,next_action=case new.state when 'reported' then 'Participant reported meeting completion. Verify further outcomes separately.' else 'Permission withdrawn. End follow-up.' end where id=new.intro_id;
 end if;
 if new.intake_id is not null then
  update public.submissions set status=case new.state when 'requested' then 'pending' when 'withdrawn' then 'archived' else 'approved' end where id=new.intake_id;
 end if;
 return new;
end $$;
revoke all on function private.sync_case_source_state() from public,anon,authenticated;
create trigger sync_case_source after update of state on private.partner_cases for each row execute function private.sync_case_source_state();
-- Project transitions already recorded by the validation release into their original source rows.
update private.partner_cases set state=state where state<>'requested';
commit;
