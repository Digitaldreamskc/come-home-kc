-- Run after loading the validation fixture. All temporary identities and delivery changes roll back.
begin;
create temp table actors as select n,gen_random_uuid() uid,gen_random_uuid() sid from generate_series(1,3)n;
grant select on actors to authenticated;
insert into auth.users(id,email,email_confirmed_at) select uid,uid||'@example.test',now() from actors;
insert into auth.sessions(id,user_id,created_at,updated_at) select sid,uid,now(),now() from actors;
insert into public.tenant_members(tenant_id,user_id) select 'b2000000-0000-4000-8000-000000000001',uid from actors;
insert into public.user_roles(tenant_id,user_id,role) select 'b2000000-0000-4000-8000-000000000001',uid,'admin' from actors where n=1;
insert into public.organization_members(tenant_id,organization_id,user_id,verified_at) select 'b2000000-0000-4000-8000-000000000001','de270000-0000-4000-8000-000000000001',uid,now() from actors where n=2;
create function pg_temp.actor(i int) returns void language plpgsql as $$
declare a record;begin
 select * into a from actors where n=i;
 perform set_config('request.headers','{"x-tenant-id":"b2000000-0000-4000-8000-000000000001"}',true);
 perform set_config('request.jwt.claim.sub',a.uid::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a.uid,'session_id',a.sid,'role','authenticated')::text,true);
end $$;
set local role authenticated;
do $$declare c uuid; w jsonb;begin
 perform pg_temp.actor(1);w:=public.partner_workspace();
 select (e->>'id')::uuid into strict c from jsonb_array_elements(w->'agreements') a,jsonb_array_elements(a->'commitments') e where a->>'id'='de270000-0000-4000-8000-000000000002' and e->>'pillar'='Talent strategy';
 perform public.partner_delivery(c,'submit','synthetic-private-evidence');
 perform public.partner_delivery(c,'submit','synthetic-private-evidence');
 perform pg_temp.actor(2);w:=public.partner_workspace();
 if jsonb_array_length(w->'agreements')<>1 or w::text like '%synthetic-private-evidence%' or w::text like '%"submitted"%' then raise exception 'Partner projection failed';end if;
 begin perform public.partner_delivery(c,'approve');raise exception 'Partner could approve';exception when insufficient_privilege then null;end;
 perform pg_temp.actor(1);perform public.partner_delivery(c,'approve');
 perform pg_temp.actor(2);w:=public.partner_workspace();
 if not exists(select 1 from jsonb_array_elements(w->'agreements'->0->'commitments') e where e->>'id'=c::text and e->>'state'='approved') then raise exception 'Approval missing';end if;
 perform pg_temp.actor(3);
 if public.partner_workspace()->'agreements'<>'[]'::jsonb then raise exception 'Unassigned member saw agreement';end if;
 perform pg_temp.actor(1);
 perform set_config('request.headers','{"x-tenant-id":"c3000000-0000-4000-8000-000000000001"}',true);
 if public.partner_workspace()->'agreements'<>'[]'::jsonb then raise exception 'Cross-tenant read';end if;
end $$;
rollback;
