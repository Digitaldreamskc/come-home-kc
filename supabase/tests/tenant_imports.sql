-- Transactional synthetic imports; no fixture survives the test.
begin;
insert into public.tenants(id,slug,name) values('b2000000-0000-4000-8000-000000000002','synthetic-test','Synthetic test tenant') on conflict do nothing;
insert into auth.users(id,email) values('94000000-0000-4000-8000-000000000001','import-test@example.test');
insert into public.user_roles(tenant_id,user_id,role) values
('b2000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000001','admin'),
('b2000000-0000-4000-8000-000000000002','94000000-0000-4000-8000-000000000001','admin');
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$ declare tenant uuid; result jsonb; first_batch uuid; source jsonb:='{"schema_version":"1.0.0","program_id":"back2kc-come-home","employers":[{"id":"test-employer","name":"Synthetic import employer"}],"candidates":[],"demands":[],"matches":[],"outcomes":[],"tasks":[{"id":"test-task","action":"Synthetic follow-up"}]}'; begin
 foreach tenant in array array['b2000000-0000-4000-8000-000000000001'::uuid,'b2000000-0000-4000-8000-000000000002'::uuid] loop
 perform set_config('request.headers',jsonb_build_object('x-tenant-id',tenant)::text,true);
 result:=public.import_legacy(source,'Synthetic security test');
 if (result->>'replayed')::boolean then raise exception 'Cross-tenant import deduplication';end if;
 if (result->'report'->>'imported_records')::int<>2 then raise exception 'Import did not preserve both records';end if;
 if first_batch=(result->>'batch_id')::uuid then raise exception 'Shared import identity';end if;
 first_batch:=(result->>'batch_id')::uuid;
 result:=public.import_legacy(source,'Synthetic replay');
 if not (result->>'replayed')::boolean then raise exception 'Same-tenant import replay failed';end if;
 if exists(select 1 from public.import_batches where tenant_id<>tenant) then raise exception 'Import history disclosure';end if;
 end loop;
end $$;
reset role;
select 'PASS: tenant-scoped import, independent identity, source preservation and replay' as result;
rollback;
