begin;
create function public.record_new2kc_source(response_key text,observed timestamptz,need text,updates text,wording text)
returns uuid language plpgsql security definer set search_path='' as $$
declare t uuid:=private.current_tenant(); uid uuid:=private.path_uid(); key text; intake uuid;begin
 if t is null or public.user_is_admin() is not true then raise exception 'Staff role required' using errcode='42501';end if;
 if length(response_key) not between 1 and 300 or observed is null or length(need)>3000 then raise exception 'Invalid response';end if;
 key:='new2kc-form-14Zex_YOHYuTDtK5_f12bn9HCH_8EnHl2k158JvTnzg0:'||t||':'||response_key;
 perform pg_advisory_xact_lock(hashtextextended(key,0));
 select id into intake from public.submissions where tenant_id=t and dedupe_key=key;
 if intake is not null then return intake;end if;
 insert into public.submissions(tenant_id,kind,payload,dedupe_key) values(t,'candidate',jsonb_build_object('source','New2KC Google Form','form_id','14Zex_YOHYuTDtK5_f12bn9HCH_8EnHl2k158JvTnzg0','response_id',response_key,'submitted_at',observed,'need',need,'updates_choice',updates,'updates_wording',wording,'personal_followup_authorized',false,'employer_sharing_authorized',false),key) returning id into intake;
 insert into public.tasks(tenant_id,action,owner,source_record) values(t,'Review New2KC intake permissions before individual follow-up','Welcome lead',jsonb_build_object('intake_id',intake,'source','New2KC Google Form'));
 return intake;
end $$;
revoke all on function public.record_new2kc_source(text,timestamptz,text,text,text) from public,anon,authenticated;
grant execute on function public.record_new2kc_source(text,timestamptz,text,text,text) to authenticated;
commit;
