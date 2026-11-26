begin;
create table private.partner_strategy_reviews (
 id uuid primary key default gen_random_uuid(),agreement_id uuid not null references private.partner_agreements,
 reviewed_at timestamptz not null default now(),reviewed_by uuid not null references auth.users,
 hiring_priorities text[] not null,activation_plan text not null,renewal_status text not null
);
alter table private.partner_strategy_reviews enable row level security;
revoke all on private.partner_strategy_reviews from public,anon,authenticated;
create function public.review_partner_strategy(agreement uuid,priorities text,plan text,renewal text) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.path_uid(); a private.partner_agreements;begin
 if public.user_is_admin() is not true then raise exception 'Staff required' using errcode='42501';end if;
 select * into strict a from private.partner_agreements where id=agreement and tenant_id=private.current_tenant() for update;
 if length(trim(plan)) not between 1 and 4000 or length(trim(priorities)) not between 1 and 2000 or renewal not in ('pending','review scheduled','renewal proposed','renewed','closed') then raise exception 'Invalid strategy review';end if;
 insert into private.partner_strategy_reviews(agreement_id,reviewed_by,hiring_priorities,activation_plan,renewal_status) values(a.id,actor,string_to_array(trim(priorities),E'\n'),trim(plan),renewal);
 update private.partner_agreements set hiring_priorities=string_to_array(trim(priorities),E'\n'),activation_plan=trim(plan),renewal_status=renewal where id=a.id;
end $$;
revoke all on function public.review_partner_strategy(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.review_partner_strategy(uuid,text,text,text) to authenticated;
commit;
