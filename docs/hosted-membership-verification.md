# Hosted tenant-membership verification

Verified against the existing isolated project `come-home-kc-m1-validation` (`kxuvmilbvwwcrxiqnftx`) on November 19, 2026. No production database was queried or changed.

## Migration

Applied the corrected SQL from PR commit `895b853`. Supabase recorded it as `20261119152620_tenant_membership_authority`; the repository filename is aligned with that ledger version to prevent a later CLI migration attempt from applying it twice. Its SQL is unchanged.

## Passing checks

- All 12 SQL test files passed against hosted PostgreSQL 17/Supabase, using rollback-only fixtures. This includes tenant writes, invitation role grants, consent revisions, erasure and tenant isolation.
- 22 Auth/REST/browser checks passed with temporary real Auth accounts: fresh-write denial; Back2KC enrollment/profile save; cross-tenant write denial; wrong-email invitation denial; uninvited civic sign-in denial and session clearing; Back2KC-to-KC Now participant invitation acceptance; persistent civic profile; existing participant accepting a programs invitation; reviewer workspace; invitation replay denial; desktop/mobile overflow checks.
- 21 checks passed against the unchanged, protected hosted previews: Mary and Jessica sign in to Back2KC, KC Now and showcase; private workspace access; own civic records; deployment protection; desktop/mobile layouts.
- All 51 application tables have RLS. Membership reconciliation left no pending review entries in this synthetic environment. Notification queue: zero.
- The unmerged PR application build passed. Local SQL rehearsal also passed all 12 suites.

## Browser scope

The new enrollment flow ran in Chromium at loopback ports 3103/3104 using the unmerged PR build and the actual hosted Supabase Auth/REST/database. The existing hosted previews were separately exercised. No new frontend was deployed, so this does not claim the PR's new portal enrollment code is running on Vercel. Invitation acceptance was exercised via the real REST RPC, followed by browser sign-in/profile/review access; no invitation delivery UI or email delivery was enabled.

## Failures corrected during verification

The tenant-write test initially collided with the already-existing KC Now tenant. Its setup now reuses that tenant and its module rows inside the rolled-back test transaction; fresh-database coverage is preserved. A browser assertion originally matched both the form error and Next's route announcer; it now targets the form error. The denial flow globally signs out its account, invalidating the harness's earlier REST session; subsequent REST assertions now obtain a fresh real Auth session. The final complete runs passed.

## Cleanup and boundaries

Both temporary Auth accounts, their sessions, invitations, synthetic profiles, roles and memberships were removed; the remaining test-account count is zero. Mary/Jessica and the pre-existing demonstrations were preserved. No notifications or invitations were sent. No merge or deployment occurred. Existing Back2KC production deployment `dpl_9NxFk7nPhjm3vtoL1f3ATWvih2SB` and its project update timestamp remained unchanged.

The requested verification gate is satisfied for resuming the existing protected synthetic review. This is not production readiness or authorization to merge/deploy. The new frontend still requires a separately authorized deployment before it can be reviewed on the hosted link. Global Auth deletion and the previously recorded production blockers remain outside this verification.
