create or replace function private.guard_job_edit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 -- Privacy scope can only bypass the employer guard for minimization, never publication.
 if tg_op='UPDATE' and new.tenant_id=private.current_tenant() and private.can_review('privacy') and new.organization_id=old.organization_id then
 if (new.created_by is null and (to_jsonb(new)-'created_by'-'updated_at')=(to_jsonb(old)-'created_by'-'updated_at')) or
 (new.title='[erased]' and new.status='archived' and new.verified_at is null and new.description='' and new.industry='' and new.employment_type='' and new.experience_level='' and new.application_url is null and new.application_instructions='' and new.salary_range is null) then return new;end if;
 end if;
 if auth.uid() is not null and not private.is_admin() then
 if tg_op='UPDATE' and new.organization_id<>old.organization_id then raise exception 'Organization cannot be changed';end if;
 if not private.owns_organization(new.organization_id) then raise exception 'Verified organization membership required';end if;
 new.verified_at=null;if new.status<>'closed' then new.status='pending';end if;new.created_by=auth.uid();
 end if;return new;
end $$;
