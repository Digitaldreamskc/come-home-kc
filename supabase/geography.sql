begin;
create function private.validate_job_publication() returns trigger language plpgsql set search_path='' as $$
 begin
 if new.status='active' then
 if not exists(select 1 from public.organizations where id=new.organization_id and verification_status='verified' and status='published') then raise exception 'Verify and publish the employer before activating a job';end if;
 if new.work_mode='remote' then
 if cardinality(new.remote_eligible_states)=0 then raise exception 'Remote jobs require verified eligible states';end if;
 elsif not exists(select 1 from public.job_locations where job_id=new.id and verified_at is not null) then
 raise exception 'Add a verified work location before activating a job';
 end if;
 end if;return new;
 end $$;
revoke all on function private.validate_job_publication() from public;
create trigger validate_job_publication before insert or update on public.job_postings for each row execute function private.validate_job_publication();
-- A location change removes active publication until the administrator checks it again.
create function private.invalidate_job_location() returns trigger language plpgsql security definer set search_path='' as $$
 begin
 update public.job_postings set status='pending',verified_at=null where id=case when TG_OP='DELETE' then old.job_id else new.job_id end and status='active';
 if TG_OP='UPDATE' and new.job_id<>old.job_id then update public.job_postings set status='pending',verified_at=null where id=old.job_id and status='active';end if;
 return case when TG_OP='DELETE' then old else new end;
 end $$;
revoke all on function private.invalidate_job_location() from public;
create trigger invalidate_job_location after insert or update or delete on public.job_locations for each row execute function private.invalidate_job_location();
commit;
