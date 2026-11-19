-- Synthetic fixtures only; usable against the isolated schema and rolled back.
begin;
insert into public.tenants(id,slug,name) values
 ('e8800000-0000-4000-8000-000000000001','invitation-role-test','Invitation role test'),
 ('e8800000-0000-4000-8000-000000000002','invitation-role-other','Other invitation tenant');
insert into private.relationship_modules(tenant_id,enabled) values ('e8800000-0000-4000-8000-000000000001',true);
insert into private.program_modules(tenant_id,enabled) values ('e8800000-0000-4000-8000-000000000001',true);
insert into auth.users(id,email,email_confirmed_at) values
 ('e8810000-0000-4000-8000-000000000001','existing-member@example.test',now());
insert into auth.sessions(id,user_id,created_at,updated_at) values
 ('e8820000-0000-4000-8000-000000000001','e8810000-0000-4000-8000-000000000001',now(),now());
insert into public.tenant_members(tenant_id,user_id) values
 ('e8800000-0000-4000-8000-000000000001','e8810000-0000-4000-8000-000000000001');
insert into private.tenant_invitations(tenant_id,email,token_hash,expires_at,role,display_name) values
 ('e8800000-0000-4000-8000-000000000001','existing-member@example.test',md5('existing-participant-invite'),now()+interval '1 day','participant','Synthetic participant'),
 ('e8800000-0000-4000-8000-000000000001','existing-member@example.test',md5('existing-programs-invite'),now()+interval '1 day','programs',null),
 ('e8800000-0000-4000-8000-000000000001','existing-member@example.test',md5('existing-expired-invite'),now()-interval '1 day','programs',null),
 ('e8800000-0000-4000-8000-000000000001','other-email@example.test',md5('existing-wrong-email-invite'),now()+interval '1 day','programs',null),
 ('e8800000-0000-4000-8000-000000000002','existing-member@example.test',md5('existing-other-tenant-invite'),now()+interval '1 day','programs',null);

select set_config('request.headers','{"x-tenant-id":"e8800000-0000-4000-8000-000000000001"}',true);
select set_config('request.jwt.claim.sub','e8810000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claims','{"sub":"e8810000-0000-4000-8000-000000000001","role":"authenticated","session_id":"e8820000-0000-4000-8000-000000000001"}',true);
set local role authenticated;
do $$ declare token text; begin
 if public.enroll_tenant() is distinct from 'e8800000-0000-4000-8000-000000000001'::uuid then raise exception 'Existing membership check failed'; end if;
 if private.path_person() is not null or private.can_review('programs') then raise exception 'Token-free check granted a role'; end if;
 begin perform public.program_workspace(); raise exception 'Membership alone opened civic workspace'; exception when insufficient_privilege then null; end;

 foreach token in array array['existing-expired-invite','existing-wrong-email-invite','existing-other-tenant-invite','existing-unknown-invite'] loop
   begin perform public.enroll_tenant(token); raise exception 'Invalid invitation accepted for existing member: %',token;
   exception when insufficient_privilege then null; end;
 end loop;
 if private.can_review('programs') then raise exception 'Invalid invitation granted review access'; end if;
 -- The member cannot create or change an operator-issued reviewer invitation.
 begin update private.tenant_invitations set role='programs'; raise exception 'Member could edit invitations'; exception when insufficient_privilege then null; end;

 perform public.enroll_tenant('existing-participant-invite');
 if private.path_person() is null then raise exception 'Existing member did not become a participant'; end if;
 if private.can_review('programs') then raise exception 'Participant invitation granted reviewer access'; end if;
 if public.program_workspace() is null then raise exception 'Invited participant cannot open civic workspace'; end if;
 if public.program_command('{"type":"profile","payload":{"name":"Synthetic participant","introductionPreference":"Ask me each time"}}') is null then raise exception 'Invited participant cannot save private profile'; end if;
 begin perform public.enroll_tenant('existing-participant-invite'); raise exception 'Participant invitation replay accepted'; exception when insufficient_privilege then null; end;

 perform public.enroll_tenant('existing-programs-invite');
 if not private.can_review('programs') then raise exception 'Existing participant did not become a program reviewer'; end if;
 if private.can_review('privacy') or private.can_review('introductions') then raise exception 'Programs invitation granted unrelated reviewer scopes'; end if;
 if (public.program_workspace()->>'reviewer')::boolean is distinct from true then raise exception 'Reviewer capability missing from workspace'; end if;
 begin perform public.enroll_tenant('existing-programs-invite'); raise exception 'Programs invitation replay accepted'; exception when insufficient_privilege then null; end;
 perform public.enroll_tenant();
end $$;

reset role;
do $$ begin
 if (select count(*) from public.tenant_members where user_id='e8810000-0000-4000-8000-000000000001')<>1 then raise exception 'Role grants changed tenant membership count'; end if;
 if (select count(*) from private.path_people where user_id='e8810000-0000-4000-8000-000000000001')<>1 then raise exception 'Participant grant duplicated person'; end if;
 if (select count(*) from private.workflow_reviewers where user_id='e8810000-0000-4000-8000-000000000001')<>1 then raise exception 'Reviewer grant duplicated or added scopes'; end if;
 if (select count(*) from private.tenant_invitations where token_hash in (md5('existing-participant-invite'),md5('existing-programs-invite')) and used_at is not null and used_by='e8810000-0000-4000-8000-000000000001')<>2 then raise exception 'Accepted invitations were not consumed by the member'; end if;
 if exists(select 1 from private.tenant_invitations where token_hash not in (md5('existing-participant-invite'),md5('existing-programs-invite')) and used_at is not null and tenant_id in ('e8800000-0000-4000-8000-000000000001','e8800000-0000-4000-8000-000000000002')) then raise exception 'Invalid invitation was consumed'; end if;
end $$;
select 'PASS: existing members accept participant and programs invitations; invalid/replayed tokens and scope escalation denied' as result;
rollback;
