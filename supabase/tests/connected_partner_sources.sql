-- Rollback-only regression using isolated synthetic staff and participant sessions.
begin;
create temp table actors as select n,gen_random_uuid() uid,gen_random_uuid() sid from generate_series(1,2)n;
grant select on actors to authenticated;
insert into auth.users(id,email,email_confirmed_at) select uid,uid||'@example.invalid',now() from actors;
insert into auth.sessions(id,user_id,created_at,updated_at) select sid,uid,now(),now() from actors;
insert into public.tenant_members(tenant_id,user_id) select 'b2000000-0000-4000-8000-000000000001',uid from actors;
insert into public.user_roles(tenant_id,user_id,role) select 'b2000000-0000-4000-8000-000000000001',uid,'admin' from actors where n=1;
create function pg_temp.actor(i int) returns void language plpgsql as $$
declare a record;begin
 select * into a from actors where n=i;
 perform set_config('request.headers','{"x-tenant-id":"b2000000-0000-4000-8000-000000000001"}',true);
 perform set_config('request.jwt.claim.sub',a.uid::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a.uid,'session_id',a.sid,'role','authenticated')::text,true);
end $$;
set local role authenticated;
do $$declare first_import uuid; next_import uuid;begin
 perform pg_temp.actor(1);
 first_import:=public.record_new2kc_source('synthetic-rollback-source',now(),'Meet people','Yes','Email updates only');
 next_import:=public.record_new2kc_source('synthetic-rollback-source',now(),'Meet people','Yes','Email updates only');
 if first_import<>next_import then raise exception 'Source replay created duplicate intake';end if;
 if not exists(select 1 from public.submissions where id=first_import and payload @> '{"employer_sharing_authorized":false,"personal_followup_authorized":false}'::jsonb) then raise exception 'Email permissions escalated';end if;
 if (select count(*) from public.tasks where source_record->>'intake_id'=first_import::text)<>1 then raise exception 'Incorrect queue task count';end if;
 perform pg_temp.actor(2);
 begin perform public.record_new2kc_source('untrusted',now(),'Need','Yes','Email');raise exception 'Participant imported source';exception when insufficient_privilege then null;end;
 if exists(select 1 from public.submissions where id=first_import) then raise exception 'Private intake disclosed';end if;
 begin perform public.configure_partner('{"operation":"agreement"}');raise exception 'Participant created agreement';exception when insufficient_privilege then null;end;
end $$;
set local role anon;
do $$begin
 if has_function_privilege('anon','public.partner_case_queue()','execute') or has_function_privilege('anon','public.configure_partner(jsonb)','execute') then raise exception 'Public private access';end if;
end $$;
rollback;
