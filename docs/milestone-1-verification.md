# Milestone 1 implementation and verification — 2026-11-18

Implemented and tested in the existing repository on `codex/come-home-kc-2`, starting from `7491f30`. Authorized remote target: `codex/come-home-kc-2.0`. No production database was connected, no existing Supabase project was modified, and no public deployment was performed.

## Isolated database

User explicitly authorized creating `come-home-kc-m1-validation` in Digitaldreamskc. The resulting project is `kxuvmilbvwwcrxiqnftx`, region `us-east-2`, API `https://kxuvmilbvwwcrxiqnftx.supabase.co`. It was initially empty and is now the only configured local application database. No paid upgrade or quoted charge was accepted. Docker is unavailable; this verification used the real hosted isolated development database.

The four existing migrations and three new migrations were executed successfully. Hosted migration history was aligned to the committed filenames after the connector assigned its own execution timestamps.

New migrations:

- `20261118152907_tenant_foundation.sql`: tenants, tenant-owned rows, restrictive RLS boundaries, scoped roles and ownership, composite references, immutable tenant identity, consent/audit context, tenant regions, experience level.
- `20261118153929_harden_tenant_validation.sql`: shared region-validation trigger correction and composite candidate references for introductions.
- `20261118154822_scope_tenant_imports.sql`: tenant-scoped immutable legacy import identity, replay detection and locking; explicit identity-map columns.

Tenant selection is deployment configuration, not a browser-selected authorization credential. Database `x-tenant-id` context narrows rows; authenticated identity and existing owner/admin policies still decide access. Forging a tenant header does not grant administrative or candidate access. Missing tenant context fails closed. Service-role credentials remain privileged and are never included in the browser configuration.

No production-data migration was rehearsed. The original database was left untouched. Any future migration of existing private records requires a separately authorized backup and upgrade rehearsal.

## Implemented UI and component inventory

| Component / area | Working behavior |
| --- | --- |
| `BrandIdentity` | Approved logo, configured product name, accessible home link |
| `RegionSelector` | Tenant-driven labels, pressed state, keyboard navigation; marketplace persists selection per tenant |
| `Marketplace` | Shared header, category navigation, filters, job/employer/resource cards, grid/list, search, empty/error/loading states |
| Filters | Keyword, city, industry, work style, employment type, experience; collapsible native mobile panel |
| Candidate portal | Private profile, independent consent controls, introduction requests, export/deletion request pathways |
| Employer portal | Verification request, authorized pending job submission/edit/close, re-review after edits |
| Admin workspace | Distinct private interface, responsive section navigation, review queue, forms, tables, tasks and outcomes |
| Existing account components | Sign-in, account creation, password visibility/recovery and accessible labeled forms retained |
| Extension interfaces | Typed AI provider and allowlisted connector contracts; no AI provider or external connector activated |

Free core access and human-reviewed introductions remain invariants in configuration. Sponsorship inquiries remain distinct from verified hiring access. No payment gate was introduced.

Official brand source: [Back2KC Brand Standards (3).pdf](https://drive.google.com/file/d/1I2uLV5miw-7tskXp1ONDPwCW2lwX8ASw/view). The actual embedded logo and its transparency mask were extracted unchanged into `public/brand/back2kc.png`. Config uses blue `#00AEEF`, gold `#F7B733`, navy `#062D43`, cloud `#F5F7FA`, slate `#6A7780`; self-hosted Montserrat and Lato fonts are pinned. Reference screenshots informed layout only.

`tenants/back2kc.json` supplies Back2KC identity, colors, typography, layout and All KC / Missouri / Kansas geography. `tenants/synthetic.json` uses a clearly fictional Lakes identity and All regions / Minnesota / Wisconsin through the same components. Tenant configuration is validated with Zod. Changing the deployed tenant requires matching database tenant/region records and rebuilding; there is no public tenant-administration endpoint.

`/preview` and `/preview/synthetic` require `ENABLE_LOCAL_DEMO=1` and localhost. Every synthetic card and the page banner identify demonstration data; cards do not accept applications. `/api/catalog` uses real isolated database records and never serves these layout fixtures. The second tenant is exercised transactionally in database tests and through local configuration; no second deployment exists.

## Validation results

- ESLint: pass.
- TypeScript: pass.
- Unit tests: 15 passed.
- Next.js production build: pass with the real isolated Supabase URL and publishable key.
- Playwright: 22 passed; 1 skipped (real one-time email recovery fixture not supplied). Candidate persistence, employer authorization and administrator journeys used real Auth and database APIs. Other recovery tests verify UI/error handling with controlled responses.
- Database SQL suites: `security.sql`, `geography.sql`, `tenant_isolation.sql`, `tenant_imports.sql` all passed on the actual isolated database. Each SQL suite rolls back its synthetic fixtures.
- Browser screenshots and document-overflow assertions: marketplace, candidate profile, employer form, admin overview and review queue at 1440, 1024, 768, 390 and 375px; synthetic tenant screenshot at 1440px.
- Visual review corrected logo transparency, filter spacing, mobile header alignment, footer contrast and unstyled admin navigation. Keyboard region navigation and mobile filters are exercised. This is not a full WCAG 2.2 AA certification or screen-reader audit.

Four synthetic Auth accounts remain in the isolated project for repeatable browser testing; credentials are in ignored `.test-accounts.json`, never committed. Browser fixtures restore/delete their own records. No real user or production data was imported.

## Security test plan and coverage

The executable SQL suites assert anonymous candidate denial, owner-only profiles, employer candidate denial, tenant-scoped administrators, forged tenant rows/headers, missing-context denial, role escalation rejection, cross-organization writes, composite cross-tenant reference rejection, immutable tenant ownership, consent history, public listing verification/expiry, geography validation/re-review, RLS inventory, and independent two-tenant import replay behavior. Browser tests additionally exercise actual sessions, API authorization, saved consent and pending listings excluded from public catalog.

Run application checks with `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`. Use the committed lockfile for installation (`pnpm install --frozen-lockfile`). Run each `supabase/tests/*.sql` in a privileged connection to the explicitly identified isolated database; do not run them in production. The integration fixture file is intentionally private and is not a general production bootstrap mechanism.

## Outstanding configuration and hardening

1. **No database credential blocker remains for this local milestone.** Local `.env.local` already contains the real isolated API URL, browser-safe publishable key, `NEXT_PUBLIC_TENANT_KEY=back2kc`, and local demo flag. CLI direct-connection automation would additionally require a securely supplied development DB password/connection string; none is needed for the connector-based verification already completed.
2. **Auth security:** the latest advisor reports leaked-password protection disabled. Before a public launch, review availability/cost and enable it in this project's Auth password-security settings. Request approval if a paid plan is required. [Supabase remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
3. **Email acceptance:** configure authorized development callback URLs and an approved email-delivery arrangement before testing signup confirmation/recovery delivery. Supply a one-time synthetic recovery fixture for the skipped test. No external SMTP integration or test email was activated/sent.
4. **Performance:** the advisor flags 24 uncovered foreign-key indexes, 4 groups of duplicate reference indexes, 22 overlapping permissive-policy cases and unused indexes in this nearly empty project. These are retained in the evidence report for a measured indexing/policy optimization pass before scale. The restrictive tenant boundary remains in effect across those permissive policies. [Index guidance](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [duplicate indexes](https://supabase.com/docs/guides/database/database-linter?lint=0009_duplicate_index), [policy guidance](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies).
5. **Intentional deny-all:** `private.rate_limits` has RLS without user policies and produces an informational notice. It is used only through controlled definer logic. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
6. **Product acceptance:** owner review of responsive screenshots, full assistive-technology audit, richer employer onboarding/review ergonomics, and sponsor-specific reporting remain follow-on work. No AI, messaging provider, live job feed or connector is active.

`vercel.json` disables Git-triggered Vercel deployment for these changes. No repository deploy workflow was present. This does not claim a blanket freeze of independent manual deployment paths or hosted settings.
