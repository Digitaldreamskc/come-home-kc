# Phase 3 — independent organizational demonstrations

## Architecture decision

Use the existing isolated development project `come-home-kc-m1-validation` (`kxuvmilbvwwcrxiqnftx`) with independent tenant boundaries. Back2KC keeps its existing tenant; the KC Now concept uses `c3000000-0000-4000-8000-000000000001`. No production system or Social Balances participant database is connected.

This is logical application/data isolation, not separate infrastructure, project administrators, Auth service, quotas, or outage domains. Separate projects remain the stronger choice if independent operators or contractual infrastructure isolation are required. Creating another project now would duplicate migration and fixture administration without improving the demonstrated participant permissions.

Each application selects its tenant on the server. Browser-supplied tenant/role/owner fields cannot grant access. KC Now has separate synthetic Auth identities and a `civic-auth` cookie; Back2KC retains its existing cookie and users. Separate `CIVIC_SUPABASE_URL` / `CIVIC_SUPABASE_PUBLISHABLE_KEY` settings permit a future independent project. Both currently point to the same authorized isolated project. No service-role key is shipped to the browser.

One ordered migration chain defines the shared engine and additive program tables. The application has three process modes; proxy gates reject routes belonging to another application. Civic and showcase modes are localhost-only and require explicit enable flags. The showcase checks a protected `showcase` reviewer scope and links to the two applications; it does not query their participants. Its Back2KC review session does not authenticate the civic application.

## Running the previews

After `npm ci` and `npm run build`, supply the isolated environment settings securely, then use three terminals:

```text
node scripts/start-preview.mjs back2kc
node scripts/start-preview.mjs kcnow
node scripts/start-preview.mjs showcase
```

Ports are 3100, 3101, and 3102, bound to 127.0.0.1. Synthetic credentials stay in ignored local fixtures and are not included in review artifacts. Do not use these accounts for real people. KC Now is invitation-only in this demonstration: there is no public enrollment or real invitation delivery.

## Shared and organization-specific components

| Capability | Shared implementation | Organizational configuration |
|---|---|---|
| Identity and privacy | Supabase Auth, active-session checks, tenant membership, scoped reviewers | Distinct synthetic identities, tenant ID, cookie, environment settings |
| Introductions | Persistent `path_*` tables, server transitions, versioned consent, expiry, contact grants | Title, API base, navigation destinations, permissioned relationship records |
| UI foundation | Tenant token schema, brand component, introduction cards, history, mobile timeline | Back2KC approved assets; conceptual civic forest/ivory/serif treatment without a claimed official logo |
| Program experience | Program catalog, private profiles, learning/interest/outcome records, guarded commands | Civic stages, interests, audiences, categories, copy and navigation |
| Organization authority | Existing verified organization memberships | Tenant-local fictional civic organization |
| Human review | Existing workflow-reviewer registry | `programs`, `introductions`, `privacy`, `showcase` scopes |
| Deletion | Existing request queue, operator classification, retention holds, atomic erasure | Additional program JSON/text stores included in canonical fulfillment |

Back2KC does not depend on the civic module. The civic pages adapt a program domain; they do not relabel employment listings as civic opportunities. Learning and participation are explicitly self-reported, never certificates, appointments, or verified public impact.

## Schema and security

Additive migrations create `private.program_modules`, `program_profiles`, `program_catalog`, and `program_records`. Every table has RLS. Clients have no direct table writes or reads; narrow invoker RPC wrappers call private definer functions with empty search paths. Profile reads return only the current user's profile. Program reviewers see authorized program records, not private profiles. Organization representatives see only explicitly shared interest notes for their verified organization. They receive no profile or email implicitly.

Program and introduction commands derive the actor from a verified active Auth session. Review scope is tenant-specific. The introduction engine retains its existing staged visibility, per-attempt consent wording/version/time, fresh permissions on revisions, server-only contact disclosure, and scheduled expiry.

Deletion wraps the existing canonical fulfillment transaction. Program profile JSON, notes, outcomes, interests, and catalog text require operator-reviewed attribution. An incomplete inventory fails closed. Deletion removes owned and attributed records, including mentions in another person's JSON. It does not guess whether unstructured text mentions someone. Existing retention holds remain effective. Global Auth-account deletion is still a separate unresolved operation.

The three new SQL files are applied to the real isolated database. Existing migrations are unchanged. A fresh-project replay of the entire historical chain has not been performed in this milestone; use a new disposable project and the same ordered chain before independent deployment.

## Disable and removal

Back2KC mode rejects `/civic`, `/api/civic/*`, and `/showcase`. Civic mode rejects Back2KC account/data routes. `ENABLE_CIVIC_DEMO=0` denies the civic routes even with `APP_MODE=kcnow`; `ENABLE_PLATFORM_SHOWCASE=0` similarly disables the showcase. Stop its process to remove its local listener. No Back2KC code edit is needed.

Database disable uses the tenant's `program_modules.enabled` and `relationship_modules.enabled` flags, with the tenant's active flag as a broader boundary. Clients cannot modify these flags. The checked-in `supabase/tests/civic_removal.sql` is a **rollback-only operator dry run**, not a production deletion command. It removes the civic module's scoped synthetic rows in dependency order, deactivates the tenant, compares every Back2KC tenant-table digest, and rolls back. Shared schemas/functions and Auth identities remain intact. Global identity deletion requires a separate reviewed operation.

For an independent deployment: provision an authorized isolated project; replay the same migrations; provision only the intended tenant, memberships, scopes and synthetic fixtures; supply separate environment settings; update the explicit development-project allowlist only as part of that reviewed environment change; run all isolation/consent/deletion tests against that project. Configure independent origins and Auth redirect settings. Public deployment is not authorized by this milestone.

## Walkthrough for Jessica and Adam

1. Open the private showcase using an authorized synthetic reviewer. Compare the two workflows; no shared participant directory exists.
2. Open Back2KC and inspect its preserved talent marketplace, region filters, private account and introductions.
3. Open the KC Now concept using synthetic Alex. Save a private civic profile, review the board-service learning activity, and express interest in the fictional Riverbend board role with explicit note-sharing permission.
4. Open Find Your Path. The route through Jordan appears only after both sides confirm each relationship. Read the verification context, confirmation date and availability, then prepare a specific request.
5. Use separate authenticated team, Jordan, and Riley sessions to approve the route, accept the connector request, approve the handoff, accept the introduction and record it. No external message is sent.
6. Return as Alex, record the fictional conversation, and report participation as an orientation observer. My Civic Journey distinguishes self-reported learning/participation from introduction completion or a board appointment.
7. As Riley, inspect only the organization's permitted interest notes and record a conversation invitation or decline. As a program reviewer, review submitted opportunities and reported participation.

KC Now remains an exploratory concept, not an approved partnership, official brand, or public service.

## Production readiness

Suitable only for isolated synthetic review after validation. Retain the production hold. Outstanding: global Auth-account deletion; retention-policy decisions; classification of legacy personal data; leaked-password protection; one-time recovery-token acceptance; fresh full-chain migration replay; public enrollment and operational reviewer provisioning; production abuse controls and independent origin/cookie policies; approved civic branding and partnership; and any real notification provider activation. No real emails, invitations, imports, or public deployment were enabled.

The current MVP records reported outcomes for review rather than certifying them. Independent evidence verification, legally approved retention, and production operations are not implied by successful local tests.

## Validation results — November 18, 2026

| Check | Observed result |
|---|---|
| Production compilation, ESLint, TypeScript | Passed on final source |
| Unit tests | 51 passed |
| Phase 2 SQL regression | 67 assertions passed against the isolated database |
| Phase 3 SQL security/deletion suite | 23 assertions passed against the isolated database |
| Existing SQL suites | Security, tenant isolation, imports, geography, employer email queue, service notice all passed |
| Browser coverage | 57 distinct tests passed across full and targeted runs; one recovery-token test remains skipped |
| Final targeted browser run | All 3 civic and 3 persistent introduction tests passed |
| Responsive captures | 70 actual screenshots: 14 states at 1440, 1024, 768, 390, 375px; no horizontal overflow in those captures |
| Accessibility checks | Form controls labeled; mobile menu keyboard-operable; one main landmark; active navigation; shared timeline stacks on mobile. This is not a full WCAG certification. |
| Disable smoke test | Disabled civic home, program API and connections API returned 404 from a temporary local process |
| Removal dry run | Civic rows removed transactionally; every Back2KC tenant-table digest unchanged; rollback restored demonstration |
| Security advisor | No ERROR finding; existing leaked-password WARN; 13 INFO findings for intentionally default-deny private tables |

The first browser run exposed a test locator that vanished after successful submission; the next exposed a test race that attempted team handoff before connector acceptance finished saving. Both tests now wait for persisted UI state. The older authenticated test loader also skipped five tests on Windows because it did not split CRLF lines; that loader was corrected and all five passed. Screenshot inspection found and fixed a wrapping mobile journey number. These failures were not counted as successful validation.

Additional hardening caught during implementation: direct RPC profile field types now receive database validation, optional LinkedIn URLs use a corrected database pattern, organization members cannot approve their own organization's catalog entry even if they also have a program-review role, and showcase access checks the active Auth session.

### Findings and severity

- **High, production hold:** global Auth deletion and reviewed retention/legacy attribution remain unresolved operational requirements. Tenant-local erasure is tested; global erasure is not claimed.
- **Medium, production hold:** leaked-password protection remains disabled; one-time recovery-token acceptance is unverified; production rate limiting, origin/cookie policies and reviewer provisioning require acceptance.
- **Medium, addressed in this milestone:** direct-RPC profile validation and independent catalog-review checks were added; client input cannot supply actor, tenant, reviewer, or consent provenance.
- **Informational:** tenant isolation shares project administrators and Auth infrastructure. A separate project is required for infrastructure independence. KC Now branding and partnership approval do not exist.

Recommendation: proceed with private synthetic product review. Do not deploy publicly or import real participants. A fresh-project migration replay and production acceptance remain outstanding before an independently hosted release.
