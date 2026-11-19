begin;
create or replace function private.program_command(command jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare t uuid:=private.current_tenant();u uuid:=private.path_uid();op text:=command->>'type';cid uuid;v uuid;org uuid;p jsonb;c private.program_catalog;rec private.program_records;k text;begin
 if not private.program_member() then raise exception 'Workspace membership required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(t::text,0));
 if octet_length(command::text)>16000 or command ?| array['tenant_id','user_id','role','reviewer','consent_wording','consented_at'] then raise exception 'Invalid command';end if;
 if op='profile' then
 p:=command->'payload';if jsonb_typeof(p)<>'object' or length(coalesce(p->>'name','')) not between 1 and 200 or (select count(*) from jsonb_object_keys(p))>12 or p-'name'-'background'-'interests'-'skills'-'affiliations'-'leadership'-'participation'-'availability'-'linkedin'-'introductionPreference'<>'{}'::jsonb then raise exception 'Invalid profile';end if;
 foreach k in array array['name','background','skills','affiliations','leadership','participation','availability','linkedin','introductionPreference'] loop
 if p ? k and (jsonb_typeof(p->k)<>'string' or length(p->>k)>500) then raise exception 'Invalid profile field';end if;
 end loop;
 if p ? 'interests' then
 if jsonb_typeof(p->'interests')<>'array' then raise exception 'Invalid interests';end if;
 if jsonb_array_length(p->'interests')>12 or exists(select 1 from jsonb_array_elements(p->'interests') x where jsonb_typeof(x)<>'string' or length(x::text)>82) then raise exception 'Invalid interests';end if;
 end if;
 if p ? 'introductionPreference' and p->>'introductionPreference' not in ('Ask me each time','Not seeking introductions') then raise exception 'Invalid preference';end if;
 if coalesce(p->>'linkedin','')<>'' and p->>'linkedin' !~ '^https://(www[.])?linkedin[.]com/in/[^ /]+/?$' then raise exception 'Invalid LinkedIn link';end if;
 insert into private.program_profiles(tenant_id,user_id,payload) values(t,u,p) on conflict(tenant_id,user_id) do update set payload=excluded.payload,updated_at=now() returning id into v;return v;
 elsif op='catalog' then
 org:=(command->>'organization_id')::uuid;if not private.owns_organization(org) then raise exception 'Verified organization membership required' using errcode='42501';end if;
 if command->>'kind' not in ('learning','opportunity') then raise exception 'Invalid kind';end if;
 insert into private.program_catalog(tenant_id,organization_id,kind,title,description,category,jurisdiction,requirements,process) values(t,org,command->>'kind',command->>'title',command->>'description',left(command->>'category',100),left(command->>'jurisdiction',100),left(command->>'requirements',1000),left(command->>'process',1000)) returning id into v;return v;
 elsif op='review' then
 if not private.can_review('programs') or command->>'state' not in ('approved','declined') then raise exception 'Review scope required' using errcode='42501';end if;
 if exists(select 1 from private.program_catalog where tenant_id=t and id=(command->>'id')::uuid and private.owns_organization(organization_id)) then raise exception 'An independent reviewer is required' using errcode='42501';end if;
 update private.program_catalog set status=command->>'state' where tenant_id=t and id=(command->>'id')::uuid returning id into v;if v is null then raise exception 'Unavailable';end if;return v;
 elsif op='interest_decision' then
 select * into rec from private.program_records where tenant_id=t and id=(command->>'id')::uuid and kind='interest' and consented_at is not null for update;
 select * into c from private.program_catalog where tenant_id=t and id=rec.catalog_id;
 if rec.id is null or not private.owns_organization(c.organization_id) or command->>'state' not in ('conversation_invited','declined') then raise exception 'Organization scope required' using errcode='42501';end if;
 update private.program_records set state=command->>'state' where tenant_id=t and id=rec.id;return rec.id;
 elsif op in ('learning','interest','outcome') then
 cid:=(command->>'catalog_id')::uuid;select * into c from private.program_catalog where tenant_id=t and id=cid and status='approved';if c.id is null then raise exception 'Available activity required';end if;
 if op='learning' and (c.kind<>'learning' or command->>'state' not in ('reviewed','completed_self_reported')) then raise exception 'Invalid learning state';end if;
 if op in ('interest','outcome') and c.kind<>'opportunity' then raise exception 'Opportunity required';end if;
 if op='interest' and command->'consent'<>'true'::jsonb then raise exception 'Explicit permission required';end if;
 if op='interest' and command->'consent' is null then raise exception 'Explicit permission required';end if;
 if op='outcome' and not exists(select 1 from private.program_records where tenant_id=t and user_id=u and catalog_id=cid and kind='interest') then raise exception 'Record interest before participation';end if;
 insert into private.program_records(tenant_id,user_id,catalog_id,kind,state,note,consent_wording,consented_at) values(t,u,cid,op,case when op='learning' then command->>'state' when op='interest' then 'awaiting_response' else 'participation_self_reported' end,coalesce(command->>'note',''),case when op='interest' then 'Share this expression of interest with this opportunity organization. My private civic profile and email are not included.' end,case when op='interest' then now() end)
 on conflict(tenant_id,user_id,catalog_id,kind) do update set state=excluded.state,note=excluded.note,consent_wording=excluded.consent_wording,consented_at=excluded.consented_at returning id into v;return v;
 end if;raise exception 'Unknown command';end $$;

create or replace function public.showcase_access() returns boolean language sql security invoker set search_path='' as $$select private.path_uid() is not null and private.can_review('showcase')$$;
commit;
