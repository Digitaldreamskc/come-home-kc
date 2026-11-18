begin;
select set_config('request.headers','{"x-tenant-id":"b2000000-0000-4000-8000-000000000001"}',true);
do $$ declare org uuid; job uuid; loc uuid; begin
 insert into public.organizations(name,status,verification_status,verified_at) values('Synthetic geography employer','published','verified',now()) returning id into org;
 begin
 insert into public.job_postings(organization_id,title,description,application_url,status,verified_at,expires_at) values(org,'Unknown location','Test','https://example.test','active',now(),now()+interval '1 day');
 raise exception 'Unknown location was published';
 exception when raise_exception then if SQLERRM='Unknown location was published' then raise;end if;end;
 begin
 insert into public.job_postings(organization_id,title,description,application_url,work_mode,status,verified_at,expires_at) values(org,'Remote eligibility unknown','Test','https://example.test','remote','active',now(),now()+interval '1 day');
 raise exception 'Unknown remote eligibility was published';
 exception when raise_exception then if SQLERRM='Unknown remote eligibility was published' then raise;end if;end;
 insert into public.job_postings(organization_id,title,description,application_url,status,verified_at,expires_at) values(org,'Verified Kansas job','Test','https://example.test','pending',now(),now()+interval '1 day') returning id into job;
 insert into public.job_locations(job_id,city,state,verified_at) values(job,'Synthetic Kansas city','KS',now()) returning id into loc;
 update public.job_postings set status='active' where id=job;
 if not exists(select 1 from public.job_postings where id=job and status='active') then raise exception 'Verified work location failed';end if;
 update public.job_locations set verified_at=null where id=loc;
 if exists(select 1 from public.job_postings where id=job and status='active') then raise exception 'Location change failed to remove publication';end if;
end $$;
select 'PASS: unknown onsite/remote geography blocked; verified location activates; changed location returns to review' as result;
rollback;
