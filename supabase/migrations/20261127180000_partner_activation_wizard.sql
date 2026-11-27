create or replace function public.activate_partner(command jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare t uuid:=private.current_tenant(); a uuid; o uuid; s date; e date; d date; item jsonb; owner text; employer text; n int; 
begin
 if t is null or auth.uid() is null or public.user_is_admin() is not true then raise exception 'Staff required' using errcode='42501'; end if;
 if octet_length(command::text)>24000 or command->>'template' not in ('corporate','custom') or coalesce(command->>'confirmed','')<>'yes' then raise exception 'Review required'; end if;
 o:=(command->>'organization')::uuid; s:=(command->>'start')::date; e:=(command->>'end')::date; owner:=trim(command->>'owner');
 if s is null or e is null or e<s or owner is null or owner='' or length(owner)>120 then raise exception 'Invalid terms or owner'; end if;
 select name into strict employer from public.organizations where id=o and tenant_id=t and status='published' and verification_status='verified';
 perform pg_advisory_xact_lock(hashtextextended(t::text||o::text,0));
 if exists(select 1 from private.partner_agreements where tenant_id=t and organization_id=o and term_start<=e and term_end>=s) then raise exception 'An overlapping agreement exists'; end if;
 if jsonb_typeof(command->'commitments') is distinct from 'array' then raise exception 'Commitments required'; end if;
 n:=jsonb_array_length(command->'commitments'); if n<1 or n>30 then raise exception 'Select 1 to 30 commitments'; end if;
 if command->>'template'='corporate' and (n<>7 or (select count(distinct x->>'pillar') from jsonb_array_elements(command->'commitments') x)<>7) then raise exception 'Confirm all seven corporate pillars or choose custom'; end if;
 if exists(select 1 from unnest(string_to_array(command->>'reviews',',')) x where trim(x)::date not between s and e) then raise exception 'Review dates must be within term'; end if;
 a:=public.configure_partner(command||jsonb_build_object('operation','agreement'));
 for item in select value from jsonb_array_elements(command->'commitments') loop
  d:=(item->>'due')::date;
  if d is null or d not between s and e or coalesce(trim(item->>'deliverable'),'')='' or coalesce(trim(item->>'owner'),'')='' then raise exception 'Each commitment needs an owner, deliverable and in-term date'; end if;
  insert into private.partner_commitments(agreement_id,pillar,deliverable,owner_label,due_date) values(a,item->>'pillar',item->>'deliverable',item->>'owner',d);
 end loop;
 insert into public.tasks(tenant_id,action,owner,due_date,notes,source_record)
 select t,employer||': '||v.title,owner,least(e,s+v.days),'Internal planning only; no external action has been taken.',jsonb_build_object('agreement_id',a,'kind',v.kind)
 from (values ('Confirm primary employer contact',7,'contact'),('Schedule kickoff strategy meeting',14,'kickoff'),('Collect approved brand assets',14,'assets'),('Confirm hiring priorities',14,'priorities'),('Prepare employer profile for approval',21,'profile'),('Prepare annual activation calendar',30,'calendar'),('Prepare welcome packet and account invitation for approval',7,'invitation'),('Confirm invoicing and payment schedule for approval',7,'finance'),('Review renewal options',greatest(0,e-s-60),'renewal')) v(title,days,kind);
 insert into public.tasks(tenant_id,action,owner,due_date,notes,source_record)
 select t,employer||': Quarterly partnership review',owner,review_date,'Internal milestone; calendar invitation not sent.',jsonb_build_object('agreement_id',a,'kind','review') from private.partner_agreements pa cross join lateral unnest(pa.review_dates) review_date where pa.id=a;
 return a;
end $$;
revoke all on function public.activate_partner(jsonb) from public,anon;
grant execute on function public.activate_partner(jsonb) to authenticated;
