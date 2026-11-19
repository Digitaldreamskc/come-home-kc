# Phase 2 security and persistence

Status: verified isolated-development implementation, not a production-security certification. No production migration, deployment, real participant import, notification, or invitation was performed.

## Implemented boundaries

The existing Supabase Auth identity and tenant-header architecture are reused. A tenant header selects context; it does not grant membership or reviewer authority. Operator-managed `private.workflow_reviewers` grants are specific to both tenant and workflow (`introductions`, `profiles`, `privacy`). General administrators no longer automatically read private profiles, change consent history, or review introductions. Communications-consent facts are now written only by the profile trigger, with server-controlled version, source and time.

`/connections` and `/api/connections` provide the persistent signed-in workflow. Both are restricted to localhost, `ENABLE_LOCAL_DEMO=1`, no Vercel environment, and the authorized development project `kxuvmilbvwwcrxiqnftx`. They use the ordinary publishable key and the user's verified Auth session, never a service-role key. The database additionally rejects expired/revoked sessions. The Phase 1 `/find-your-path` demonstration remains unchanged and is explicitly a simulation.

Participant roles come from the request's requester/connector/recipient foreign keys. A participating reviewer cannot review their own request. Drafts are requester-only; connectors see requests after route approval; recipients see them after handoff approval. Profile records are never joined into path projections. No wider relationship graph is sent to the browser.

The `private.path_command` state machine owns every transition. Clients cannot edit requests, attempts, consent records, event facts, reviewer grants, or module settings directly. A revision creates a separate attempt; it never copies consent. Old wording, version, grant/denial, and timestamp remain, but invalidated attempts cannot authorize new actions. Email-sharing consent is separate from request/acceptance consent. `path_contacts` returns an opted-in counterparty email only after introduction, never to reviewers or connectors.

Event facts contain fixed action kinds, identifiers and timestamps. Redactable free text is stored separately. Private follow-up notes are excluded from recipient/connector projections and protected by RLS even under direct authenticated SQL access. A five-minute `pg_cron` task expires pending attempts independently of page loads.

## Code-and-schema findings

Severity describes the impact if the earlier demonstration/legacy behavior were used for a real participant workflow.

| Finding | Severity | Resolution / remaining limit |
|---|---|---|
| Session-only requests and simulated actor choice cannot authorize real users | High | Added real Auth, database persistence, relationship-derived roles and server-side transitions; preserved simulation separately. |
| Ambient administrator authority over sensitive profiles/introductions | High | Explicit tenant/workflow grants; read-only profile-review scope; regression tests now test scoped access. |
| Revisions could reuse mutable consent flags | High | Separate attempts and immutable consent facts; prior attempt invalidation; fresh consent enforced in DB. |
| Email must not be exposed through profile queries or an early role projection | High | Narrow contact RPC, introduction and current-attempt grant checks; negative role tests pass. |
| Deletion intake lacked complete fulfillment across text/JSON/derived records | High | Scoped erasure procedure, account-intake queue bridge, conservative attribution inventory, linked-record scrubbing and retention-hold boundary. Global Auth deletion remains separate. |
| Legacy free-text classification could become stale or race with erasure | High | Updates/deletes invalidate classifications; erasure locks inventory and legacy write tables while checking and minimizing data. Operational performance testing remains before large datasets. |
| Expiry depended on application use | Medium | Scheduled database expiry plus synchronous deadline checks. |
| New RLS note policy attempted a read of an intentionally ungranted relationship table | Medium | Found by integration tests; replaced with a narrow definer visibility helper without exposing the table. |
| Legacy employer edit guard blocked authorized redaction | Medium | Narrow privacy-scope exception permits only minimization, not publication. |
| Leaked-password protection disabled | Medium, open | Supabase advisor warning; review/enable Auth password protection before launch, subject to plan/cost approval. |

Supabase also reports informational “RLS enabled, no policy” notices for 11 private tables intentionally denied to direct client access. These are served only through narrowly authorized functions. The remaining Auth warning is documented at [Supabase password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Deletion coverage and limits

`path_request_deletion` queues the signed-in user's workspace request. Existing account deletion submissions enter the same queue transactionally. Only a privacy reviewer for that tenant can call `path_erase`. A retention hold prevents automatic completion until an authorized minimization decision is supplied; the code does not invent a retention law or duration.

Erasure removes the subject's profile, legacy job-introduction requests and linked outcomes, intake payloads, communications preferences, organization memberships, reviewer/admin grants, queued delivery records, and rate-limit attribution. It scrubs associated path notes, relationship context, event actors, attempt context, and participant identity. Historical consent wording/version/time are minimized rather than silently rewritten.

The operator-reviewed `personal_data_inventory` must classify every row in covered unstructured stores before fulfillment. A row may identify multiple subjects; an empty list means reviewed as nonpersonal. Covered stores include tasks, employer conversations, job needs, evidence, import batches/records/maps, organizations, job postings/locations, resources/eligibility, events, other people's submissions, legacy introductions/outcomes, path attempts, event notes and relationship text. This is deliberately conservative: unknown text blocks completion. It is not an automated guarantee that every reference to a person has been discovered.

The verified deletion tests inject a personal-data sentinel into 19 stores and prove it is absent afterward, including another person's submission and imported JSON. The tests also prove retained consent facts lose the subject link and another workspace's identity is unchanged. All test fixtures roll back.

Remaining deletion release work: approve retention/minimization rules, review actual legacy attribution, implement an authorized global Auth-identity deletion process across workspaces, and document backup/log/external-copy handling. Workspace erasure currently retains a shared Auth identity. Do not present that as global account deletion. Operator-only database records can still be changed by a database owner; application append-only guarantees do not make them tamper-proof against infrastructure administrators.

## Optional workspace configuration

`private.relationship_modules` is keyed by the existing tenant ID and defaults disabled. Each tenant has its own title, enable flag and reconfirmation interval; participant identities, reviewer assignments, relationships and attempts have tenant-paired foreign keys. Tests disable and remove an independent synthetic module while the primary synthetic workspace continues working. Existing white-label brand/geography configuration remains unchanged. No KC Now partner identity or UI was added.

Example for an already provisioned **synthetic** tenant, executed only by an authorized database operator:

```sql
insert into private.relationship_modules(tenant_id, enabled, title, reconfirm_months)
values (:synthetic_tenant_id, true, 'Community connections', 6);
update private.relationship_modules set enabled=false where tenant_id=:synthetic_tenant_id;
-- Removing just this configuration leaves other tenants untouched.
delete from private.relationship_modules where tenant_id=:synthetic_tenant_id;
```

## Verification and reproduction

Seven additive Phase 2 migrations were applied to `come-home-kc-m1-validation`. Historical migrations were not edited. Local migration versions match the hosted migration history. `supabase/tests/phase2.sql` executes real RLS/function tests in a rolled-back transaction, using synthetic tenants, Auth users/sessions and `SET LOCAL ROLE authenticated/anon`. The browser tests additionally authenticate four real synthetic Supabase accounts through the running app; SQL role simulation is not the sole evidence.

Run lint, TypeScript, unit tests and a production build locally. Run all SQL suites only against the isolated project. `scripts/prepare-path-fixtures.mjs` generates fixture SQL from ignored synthetic account IDs without reading out passwords or contacting a database. Applying it requires an operator and must target only the authorized isolated project; it does not seed participant consent. The browser test makes those choices through authenticated RPCs.

Start localhost with `ENABLE_LOCAL_DEMO=1`, then run `npx playwright test tests/e2e/persistent-paths.spec.ts`. To prove server-restart persistence, stop/restart the server and rerun with `--grep "retrieves the same"`; this uses the attempt ID written by the full flow to the ignored evidence artifact. Screenshots are actual app captures at 1440, 1024, 768, 390 and 375px. Artifact folders and account/environment files are not committed.

Verified scope: authorization/consent tests, deletion fixtures, applied migration execution, scheduled runs, four-account browser behavior and local build. A clean-database restore/replay, independent penetration assessment, production-scale concurrency/load, global deletion, operational retention and enabled production Auth protections are not claimed. Existing manually attested legacy introduction records are preserved; they are not retroactively converted into per-attempt participant consent.

Ready for continued isolated development and review. Not ready to remove the deployment hold or import real participants.
