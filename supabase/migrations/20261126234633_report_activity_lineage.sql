begin;
-- Preserve the private evidence behind issued reports without embedding participant
-- identifiers or small-cohort counts in the partner-visible snapshot.
create table private.report_activity_evidence(
 report_id uuid not null references private.partner_reports on delete cascade,
 case_id uuid not null references private.partner_cases on delete cascade,
 commitment_id uuid not null references private.partner_commitments,
 recorded_state text not null, observed_at timestamptz not null,
 primary key(report_id,case_id)
);
alter table private.report_activity_evidence enable row level security;
revoke all on private.report_activity_evidence from public,anon,authenticated;
create function private.record_report_activity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into private.report_activity_evidence(report_id,case_id,commitment_id,recorded_state,observed_at)
 select new.id,pc.id,c.id,pc.state,pc.completed_at from private.partner_cases pc join private.partner_commitments c on c.id=pc.commitment_id
 where c.agreement_id=new.agreement_id and c.state='approved' and pc.revoked_at is null and pc.state='reported' and
 (c.approved_at at time zone 'UTC')::date between new.period_start and new.period_end and
 (pc.completed_at at time zone 'UTC')::date between new.period_start and new.period_end;
 return new;
end $$;
revoke all on function private.record_report_activity() from public,anon,authenticated;
create trigger capture_report_activity after insert on private.partner_reports for each row execute function private.record_report_activity();
commit;
