begin;
create table private.welcome_resource_references(
 case_id uuid primary key references private.partner_cases on delete cascade,
 directory_id text not null check(length(directory_id) between 1 and 100),
 selected_at timestamptz not null default now(), selected_by uuid not null references auth.users
);
alter table private.welcome_resource_references enable row level security;
revoke all on private.welcome_resource_references from public,anon,authenticated;
create function public.recommend_directory_resource(case_id uuid,listing text) returns void
language plpgsql security definer set search_path='' as $$
declare pc private.partner_cases; actor uuid:=private.path_uid();begin
 if public.user_is_admin() is not true then raise exception 'Staff role required' using errcode='42501';end if;
 select x.* into strict pc from private.partner_cases x join private.partner_commitments c on c.id=x.commitment_id join private.partner_agreements a on a.id=c.agreement_id
 where a.tenant_id=private.current_tenant() and x.id=case_id and x.kind='welcome' and x.state='requested' and x.revoked_at is null for update of x;
 insert into private.welcome_resource_references values(pc.id,listing,now(),actor);
 update private.partner_cases set state='referred' where id=pc.id;
 update public.tasks set action='Follow up on the directory recommendation',due_date=current_date+7 where id=pc.task_id;
end $$;
create function public.welcome_resource_choices() returns table(case_id uuid,directory_id text)
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=private.path_uid();begin
 return query select r.case_id,r.directory_id from private.welcome_resource_references r join private.partner_cases pc on pc.id=r.case_id
 join private.partner_commitments c on c.id=pc.commitment_id join private.partner_agreements a on a.id=c.agreement_id
 where a.tenant_id=private.current_tenant() and pc.revoked_at is null and (pc.participant=actor or public.user_is_admin());
end $$;
revoke all on function public.recommend_directory_resource(uuid,text),public.welcome_resource_choices() from public,anon,authenticated;
grant execute on function public.recommend_directory_resource(uuid,text),public.welcome_resource_choices() to authenticated;
commit;
