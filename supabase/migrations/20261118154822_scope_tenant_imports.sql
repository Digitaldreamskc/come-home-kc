-- Preserve immutable imports while scoping identity and replay detection per tenant.
begin;
create or replace function public.import_legacy(source_data jsonb,source_name text default 'Come Home browser export') returns jsonb
language plpgsql security invoker set search_path='' as $$
<<import_legacy>>
declare
 fingerprint text; batch uuid; prior uuid; program text; collection text; item jsonb; legacy text; target uuid; existing jsonb;
 n integer:=0; imported integer:=0; duplicates integer:=0; review integer:=0; missing integer:=0; org_count integer:=0; conversation_count integer:=0; result jsonb;
begin
 if private.current_tenant() is null then raise exception 'Tenant context required';end if;
 if current_user not in ('postgres','service_role') and not private.is_admin() then raise exception 'Administrator required';end if;
 if jsonb_typeof(source_data) is distinct from 'object' or source_data->>'schema_version' is distinct from '1.0.0' or source_data->>'program_id' is distinct from 'back2kc-come-home' then raise exception 'Unsupported backup format';end if;
 if octet_length(source_data::text)>5000000 then raise exception 'Backup exceeds 5 MB';end if;
 foreach collection in array array['employers','candidates','demands','matches','outcomes','tasks'] loop
 if jsonb_typeof(source_data->collection) is distinct from 'array' then raise exception 'Missing collection %',collection;end if;
 if exists(select 1 from jsonb_array_elements(source_data->collection) x where jsonb_typeof(x)<>'object' or coalesce(x->>'id','')='') then raise exception 'Each % record requires an id',collection;end if;
 if exists(select 1 from jsonb_array_elements(source_data->collection) x group by x->>'id' having count(*)>1) then raise exception 'Duplicate IDs in %; backup unchanged',collection;end if;
 end loop;
 fingerprint:=md5(source_data::text);program:=source_data->>'program_id';
 select id into prior from public.import_batches where tenant_id=private.current_tenant() and import_batches.fingerprint=import_legacy.fingerprint;
 if prior is not null then return jsonb_build_object('batch_id',prior,'replayed',true,'report',(select report from public.import_batches where tenant_id=private.current_tenant() and id=prior));end if;
 -- Serialize concurrent imports of this program to make identity mapping deterministic.
 perform pg_advisory_xact_lock(hashtext(private.current_tenant()::text||program));
 select id into prior from public.import_batches where tenant_id=private.current_tenant() and import_batches.fingerprint=import_legacy.fingerprint;
 if prior is not null then return jsonb_build_object('batch_id',prior,'replayed',true,'report',(select report from public.import_batches where tenant_id=private.current_tenant() and id=prior));end if;
 insert into public.import_batches(source_name,fingerprint,source_data,imported_by) values(source_name,fingerprint,source_data,auth.uid()) returning id into batch;
 foreach collection in array array['employers','candidates','demands','matches','outcomes','tasks'] loop
 for item in select value from jsonb_array_elements(source_data->collection) loop
 n:=n+1;legacy:=item->>'id';target:=null;existing:=null;
 select target_id,original_record into target,existing from public.legacy_identity_map m where m.tenant_id=private.current_tenant() and m.source_program=program and m.collection=import_legacy.collection and m.legacy_id=legacy;
 if target is not null then
 if existing=item then duplicates:=duplicates+1;insert into public.import_records(batch_id,collection,legacy_id,original_record,target_id,disposition,reason) values(batch,collection,legacy,item,target,'duplicate','Existing identity retained; no update.');
 else review:=review+1;insert into public.import_records(batch_id,collection,legacy_id,original_record,target_id,disposition,reason) values(batch,collection,legacy,item,target,'review','Existing identity has different data. Both source versions retained; administrator must reconcile.');end if;
 elsif collection='employers' and coalesce(item->>'name','')<>'' then
 insert into public.organizations(name,status,verification_status) values(item->>'name','draft','research') returning id into target;
 org_count:=org_count+1;
 insert into public.employer_conversations(organization_id,contact,relationship_kind,status,notes,next_action,owner,due_date,source_url,source_record)
 values(target,coalesce(item->>'contact',''),coalesce(item->>'kind',''),coalesce(item->>'status','Prospect'),coalesce(item->>'source_note',''),coalesce(item->>'next_action',''),coalesce(item->>'owner',''),null, item->>'source_url',item);
 conversation_count:=conversation_count+1;imported:=imported+1;
 -- Due dates and all unmodeled fields remain in source_record for review; no inferred current geography or hiring commitment.
 if coalesce(item->>'hiring_contact','')='' then missing:=missing+1;end if;
 insert into public.legacy_identity_map(source_program,collection,legacy_id,target_id,original_record) values(program,collection,legacy,target,item);
 insert into public.import_records(batch_id,collection,legacy_id,original_record,target_id,disposition,reason) values(batch,collection,legacy,item,target,'imported','Research organization and private conversation preserved; publication and geography require review.');
 elsif collection='tasks' and coalesce(item->>'action','')<>'' then
 insert into public.tasks(action,owner,status,notes,source_record) values(item->>'action',coalesce(item->>'owner',''),case when item->>'status' in ('Open','Done','Cancelled') then item->>'status' else 'Open' end,coalesce(item->>'notes',''),item) returning id into target;
 imported:=imported+1;insert into public.legacy_identity_map(source_program,collection,legacy_id,target_id,original_record) values(program,collection,legacy,target,item);
 insert into public.import_records(batch_id,collection,legacy_id,original_record,target_id,disposition,reason) values(batch,collection,legacy,item,target,'imported','Task preserved; source due date retained for date review.');
 else
 review:=review+1;insert into public.import_records(batch_id,collection,legacy_id,original_record,disposition,reason) values(batch,collection,legacy,item,'review','Preserved in review queue. Identity, permissions and field mapping require review before activation.');
 end if;
 end loop;
 end loop;
 result:=jsonb_build_object('original_records',n,'imported_records',imported,'duplicates',duplicates,'requires_review',review,'missing_information',missing,'failed_imports',0,'organizations_created',org_count,'conversations_created',conversation_count,'all_source_records_preserved',n=(imported+duplicates+review));
 update public.import_batches set report=result where tenant_id=private.current_tenant() and id=batch;
 return jsonb_build_object('batch_id',batch,'replayed',false,'report',result);
end $$;
revoke all on function public.import_legacy(jsonb,text) from public,anon;
grant execute on function public.import_legacy(jsonb,text) to authenticated,service_role;
commit;
