begin;
create function private.submit_intake(p_kind text,p_payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
 declare uid uuid; email text; item uuid; key text;
 begin
 uid:=auth.uid();if uid is null then raise exception 'Sign in required';end if;
 select u.email into email from auth.users u where u.id=uid and u.email_confirmed_at is not null;
 if email is null then raise exception 'Confirmed email required';end if;
 if p_kind not in ('employer','candidate','resource','job','partnership','mixer','deletion','profile_change') then raise exception 'Unsupported request';end if;
 if jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>30000 or coalesce(p_payload->>'name','')='' or length(p_payload->>'name')>200 then raise exception 'Valid name and request required';end if;
 if coalesce(p_payload->>'website_trap','')<>'' then raise exception 'Request rejected';end if;
 if not public.consume_rate_limit('intake:'||uid::text,10,3600) then raise exception 'Please try again later';end if;
 p_payload:=p_payload||jsonb_build_object('email',email,'consent_recorded_at',now(),'policy_version','2026-11-17');
 key:=uid::text||':'||p_kind||':'||md5((p_payload-'consent_recorded_at')::text);
 select id into item from public.submissions where dedupe_key=key;
 if item is not null then return item;end if;
 insert into public.submissions(kind,user_id,payload,dedupe_key) values(p_kind,uid,p_payload,key) returning id into item;
 return item;
 end $$;
-- md5 requires text, explicitly canonicalized JSON.
revoke all on function private.submit_intake(text,jsonb) from public;
grant execute on function private.submit_intake(text,jsonb) to authenticated;
create function public.submit_intake(p_kind text,p_payload jsonb) returns uuid language sql security invoker set search_path='' as $$ select private.submit_intake(p_kind,p_payload) $$;
revoke all on function public.submit_intake(text,jsonb) from public,anon;
grant execute on function public.submit_intake(text,jsonb) to authenticated;

create function private.record_profile_consent() returns trigger language plpgsql security definer set search_path='' as $$
 begin
 if TG_OP='INSERT' or old.opportunities_consent is distinct from new.opportunities_consent then
 insert into public.communications_consent(user_id,purpose,permitted,policy_version) values(new.user_id,'professional_opportunities',new.opportunities_consent,new.consent_version);
 end if;
 if TG_OP='INSERT' or old.introductions_consent is distinct from new.introductions_consent then
 insert into public.communications_consent(user_id,purpose,permitted,policy_version) values(new.user_id,'employer_introductions',new.introductions_consent,new.consent_version);
 end if;return new;
 end $$;
revoke all on function private.record_profile_consent() from public;
create trigger profile_consent after insert or update on public.candidate_profiles for each row execute function private.record_profile_consent();
commit;
