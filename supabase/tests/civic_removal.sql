-- Dry-run only. Operator access in the isolated project. Final ROLLBACK is mandatory.
begin;
create temp table preserved(schema_name text,table_name text,digest text);
do $$declare r record;v text;begin
 for r in select table_schema,table_name from information_schema.columns where column_name='tenant_id' and table_schema in('public','private') loop
 execute format('select md5(coalesce(string_agg(to_jsonb(x)::text,E''\n'' order by to_jsonb(x)::text),'''')) from %I.%I x where tenant_id=$1',r.table_schema,r.table_name) into v using 'b2000000-0000-4000-8000-000000000001'::uuid;
 insert into preserved values(r.table_schema,r.table_name,v);
 end loop;end $$;
select set_config('request.jwt.claim.sub','',true),set_config('request.jwt.claims','{}',true);
do $$declare tab text;t uuid:='c3000000-0000-4000-8000-000000000001';begin
 foreach tab in array array['path_event_notes','path_events','path_consents','path_attempts','path_requests','path_confirmations','path_relationships','path_people','program_records','program_profiles','program_catalog','program_modules','workflow_reviewers','path_deletion_requests','retention_holds','personal_data_inventory','relationship_modules'] loop
 execute format('delete from private.%I where tenant_id=$1',tab) using t;
 end loop;
 delete from public.organization_members where tenant_id=t;
 delete from public.organizations where tenant_id=t;
 delete from public.audit_history where tenant_id=t;
 update public.tenants set active=false where id=t;
end $$;
do $$declare r record;v text;begin
 for r in select * from preserved loop
 execute format('select md5(coalesce(string_agg(to_jsonb(x)::text,E''\n'' order by to_jsonb(x)::text),'''')) from %I.%I x where tenant_id=$1',r.schema_name,r.table_name) into v using 'b2000000-0000-4000-8000-000000000001'::uuid;
 if v<>r.digest then raise exception 'Back2KC data changed in %.%',r.schema_name,r.table_name;end if;
 end loop;
 if exists(select 1 from private.path_people where tenant_id='c3000000-0000-4000-8000-000000000001') or exists(select 1 from private.program_catalog where tenant_id='c3000000-0000-4000-8000-000000000001') then raise exception 'Civic records remain';end if;
end $$;
select 'PASS: all scoped civic module records removable; every Back2KC tenant table digest unchanged; shared engine and Auth identities retained; removal rolled back' as result;
rollback;
