# KC Now post-audit correctness milestone

Baseline: `fb3cec6` on `codex/come-home-kc-2`. This milestone extends the existing shared architecture. No additional civic application, relationship engine, or Supabase project was created.

## Implemented corrections

- **Personal activity:** `private.program_workspace()` now returns `records` for the signed-in person only, plus separate `review_records` and `organization_records`. `Program` uses those collections only in their respective interfaces. Profiles remain owner-only; introduction progress still filters to the requester. Combined-role SQL tests prove organization/reviewer records do not become personal progress.
- **Introduction pause:** the existing `path_edge_valid()` checks each endpoint's saved civic preference. Discovery, draft creation, submission, subsequent handoffs, and revisions enforce the pause server-side. Historical attempts and consent records are untouched. The participant changes their own preference through the existing authorized profile action. The interface explains the pause and links back to the profile; it does not reveal why another person's route is unavailable.
- **Civic history:** `private.program_events` stores append-only, versioned snapshots of interest submissions, revisions, withdrawals, organizational decisions, and opportunity reviews/status decisions. Current records keep stable IDs; snapshots preserve prior wording, notes, consent dates, and states. Existing rows receive an explicitly labeled baseline, not invented earlier history. Each new UI submission requires the checkbox again. Withdrawal removes the organization's current-action access. Own history and authorized reviewer history are available through the existing guarded workspace RPC; there is no direct client table access.
- **Privacy:** the canonical erasure workflow now classifies and removes civic event payloads, including actor attribution and third-party free-text references. It still refuses incomplete attribution or retention holds. Normal history updates/deletes fail. A caller-set erasure flag cannot suppress interest auditing; only scoped, actual catalog minimization avoids creating another sensitive snapshot. Global Auth deletion remains outside this tenant erasure operation.
- **Availability:** server-projected `available` is authoritative for UI actions. Pending, declined, withdrawn, closed, and expired catalog items cannot accept new interest. Organization decisions require current awaiting-response interest on an available opportunity. Owners can close or withdraw; reviewers cannot silently reopen closed records. Date-only deadlines include the full date in `America/Chicago`. Eligibility remains a manual review, not a matching or eligibility engine. Past self-reported participation can still be recorded where the existing approved-record rules permit it; closing never erases prior history.
- **Sign-in fallback:** civic/showcase login forms now use POST even if JavaScript fails. This prevents credentials entering a query string. No-JavaScript browser coverage uses noncredential dummy values.

## Files and migrations

Main code: `components/platform/program.tsx`, `lib/platform/program.ts`, `lib/platform/presentation.ts`, `components/paths/persistent-workspace.tsx`, `lib/paths/persistent.ts`, and civic/showcase login pages.

Applied only to `kxuvmilbvwwcrxiqnftx` (`come-home-kc-m1-validation`):

1. `20261119020449_civic_correctness.sql`
2. `20261119021449_harden_civic_history.sql`

Existing migrations were preserved. The project now has 21 migrations. All 47 public/private application tables have RLS enabled. The new history table has no client SELECT/INSERT/UPDATE/DELETE grant; tenant- and role-scoped functions mediate access. The security advisor's 14 no-policy INFO findings describe deliberately private deny-by-default tables, including history; the leaked-password protection WARN remains unresolved.

## Verification

- Lint: passed.
- TypeScript: passed.
- Unit tests: 59 passed.
- Optimized Next.js build: passed.
- New transactional SQL suite `civic_correctness.sql`: 35 passed.
- Existing introduction security/consent/deletion suite `phase2.sql`: 67 passed.
- Civic suite `phase3.sql`, extended for historical-payload deletion: 24 passed.
- Existing security, geography, tenant-isolation, tenant-import, employer-email-queue, and service-notice SQL suites: all six passed.
- Optional civic removal rehearsal: passed with ROLLBACK; every Back2KC tenant table digest unchanged. This operator-only decommission rehearsal temporarily disables the history deletion trigger inside the rolled-back transaction. It does not grant application users removal access or bypass retention approval in normal operations.
- Disabled-mode HTTP check: civic page and data routes return 404 when its local flag is off.
- Browser regression: 65 distinct checks passed, one skipped (real recovery-token test lacks its dedicated fixture). The full run recorded 63 passed, two failed and one skipped; both failures were test-fixture/visibility assumptions and passed focused reruns after correction..
- Screenshots: actual running application at 1440, 1024, 768, 390 and 375 pixels. Overflow assertions cover every captured width. Desktop/mobile review images are in the local screenshot gallery.

SQL tests use synthetic fixtures and ROLLBACK. Browser tests use the existing synthetic accounts and leave synthetic actions/history for demonstration. No business notification or invitation delivery was activated; the queue was verified empty. No production database was accessed or changed.

### Failed checks and recovery

The first lint run caught an internal anchor that needed Next.js Link; corrected. The sandbox blocked an initial build directory write; the authorized local build passed afterward. The first browser run reached stale preview processes after a build, causing hydration failures and native GET login fallback. All eight isolated fixture passwords were rotated, their sessions revoked, and local failure artifacts sanitized; no real accounts were involved. POST fallback and a browser test prevent that URL behavior. One pre-existing civic end-to-end test assumed no prior introduced request; it now preserves that history and starts its synthetic exercise through the existing authorized command when the UI correctly shows an already-requested route. The availability test also reused a prior fixture title; unique titles corrected its selector. The earlier-history screenshot test now expands Earlier requests before capturing a closed card. Both focused reruns passed. Earlier failures remain documented rather than represented as passes.

## Three-preview walkthrough

All are loopback-only processes, not public deployments:

1. **Back2KC:** `http://127.0.0.1:3100`. Open the marketplace, change All KC / Missouri / Kansas, then use private account and introduction screens. `/civic` is unavailable. Existing verification, profiles, tasks, outcomes, and consent workflows remain in the same application.
2. **KC Now:** `http://127.0.0.1:3101/civic`. Sign in with an assigned synthetic fixture. My Civic Profile saves the introduction preference. Choose Not seeking introductions, save, reload, and visit Find Your Path: no new routes/actions appear. Resume from the profile to restore only eligible confirmed paths. My Civic Journey shows only your own records. Leadership Opportunities supports explicit interest, withdrawal and fresh resubmission; expand Consent & decision history on the journey to compare snapshots. Organization Workspace and Administrative Review keep their own authorized work separate.
3. **Protected showcase:** `http://127.0.0.1:3102/showcase`. Anonymous visitors are sent to showcase sign-in; an authorized synthetic reviewer can view the combined product overview. It does not aggregate participant records or expose civic API endpoints. Separate civic cookies do not authorize Back2KC or showcase access.

To reproduce the local modes: build once, then use `node scripts/start-preview.mjs back2kc`, `kcnow`, and `showcase` in separate processes. Stop these local processes before rebuilding to avoid stale build assets. `node scripts/check-disabled-preview.mjs` starts an isolated temporary disabled-mode process on 3103 and closes it after checking. Synthetic credentials remain in ignored local fixture files and are not included in reports.

## Remaining production blockers

1. Approve and implement global identity deletion/session lifecycle across workspaces; tenant erasure intentionally retains the shared Auth account.
2. Approve retention/minimization policy and complete personal-data attribution before real imports. Backups, logs and external copies need operational erasure procedures.
3. Resolve the existing leaked-password protection warning; verify real confirmation/recovery email configuration and one-time recovery with an authorized fixture. The real recovery-token browser test remains unavailable without `RESET_TEST_FIXTURE`.
4. Reconcile stale deployment/runbook references, verify production origins/cookies, and complete clean full-chain migration replay, backup/restore, load and independent accessibility/security acceptance. This milestone tested incremental migrations on the existing isolated project, not a newly provisioned database.
5. Decide canonical linkage between job-specific introductions and relationship introductions before claiming end-to-end hiring workflow coverage. This milestone did not merge their schemas.
6. Real notifications/invitations remain disabled. Delivery provider, sender, secrets, operational ownership and approval are still required before enabling them.
7. KC Now remains an isolated synthetic concept, not an approved partnership or production program. No verified participation/impact or automated eligibility claims are introduced.

Recommendation: ready for review of this bounded correctness milestone after the documented passing checks; not approved for public deployment or real participant onboarding.
