-- Sources checked November 17, 2026. Geography describes service coverage, not individual program eligibility.
begin;
do $$ declare r uuid; begin
 if not exists(select 1 from public.resources where url='https://www.kansasworks.com/') then
 insert into public.resources(title,description,category,url,status,verified_at,source_url)
 values('KANSASWORKS','Explore Kansas job openings, training programs and workforce-center support. Individual programs have their own eligibility requirements.','Career support','https://www.kansasworks.com/','published',now(),'https://www.kansasworks.com/') returning id into r;
 insert into public.resource_eligibility(resource_id,state,notes,verified_at) values(r,'KS','Kansas workforce system; check individual program eligibility with the provider.',now());
 end if;
 if not exists(select 1 from public.resources where url='https://jobs.mo.gov/jobseeker/missouri-job-centers') then
 insert into public.resources(title,description,category,url,contact_url,status,verified_at,source_url)
 values('Missouri Job Centers','Find Missouri job-search support, career planning, skills assessments and information about training opportunities. Contact a center to check program eligibility.','Career support','https://jobs.mo.gov/jobseeker/missouri-job-centers','https://jobs.mo.gov/job-centers','published',now(),'https://jobs.mo.gov/jobseeker/missouri-job-centers') returning id into r;
 insert into public.resource_eligibility(resource_id,state,notes,verified_at) values(r,'MO','Missouri workforce system, including Kansas City locations; individual training eligibility is determined by the provider.',now());
 end if;
end $$;
commit;
