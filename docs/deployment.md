# Development deployment

The authorized release target is a Vercel preview. The original prototype's production domain remains unchanged. Promote or connect a production domain only after explicit approval.

## Current targets

| Service | Development target |
| --- | --- |
| GitHub | `Digitaldreamskc/come-home-kc` |
| Branch | `codex/come-home-kc-2.0` |
| Supabase project | `fgmduywfdlvomgbnibzk` |
| Vercel project | `prj_MMZMKaBHxm9usmcSkmTBVgRHR3g8` |

The repository is public. Keep private source snapshots, account credentials, environment files and personal data outside GitHub. `scripts/prepare-source.mjs` produces a reviewed source-only upload manifest when the GitHub connector is used.

## Configure the preview

1. Install with `npx --yes pnpm@12.21.0 install --frozen-lockfile` using Node.js 22 or later. Run lint, type checks, unit tests and the production build.
2. Confirm the Supabase target. The existing development project already has the ordered files in `supabase/migrations/` applied. For a fresh isolated project, apply that history in order using the authorized Supabase migration workflow. Do not replay the standalone schema component files on an initialized database.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the Vercel project's **Preview** environment. They identify the isolated database and use Row Level Security. The application requires no service-role key at runtime.
4. Deploy the development branch to the new Vercel project with Next.js detection, `npx --yes pnpm@12.21.0 install --frozen-lockfile` installation and `npm run build`. Confirm the result is a preview deployment. Record its immutable URL, source commit and status in the release handoff.
5. Configure the approved local and preview account origins in Supabase Auth. Review the Site URL, permitted callback URLs and email confirmation behavior. The callback route is `/auth/callback`.
6. Configure the approved email delivery provider/SMTP and test confirmation delivery before inviting people. Create Mary and Jessica's real accounts through the approved signup process; confirm ownership before an operator assigns their administrator roles.
7. Test the deployed public directory, both region controls, private-route denial and account services. Check server errors and database policies in that environment before expanding access.

Auth redirect configuration, email delivery and real administrator onboarding remain operator setup tasks. Synthetic test accounts must never be repurposed as real user accounts or published in documentation.

## Verification

Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`. Run `npm run test:e2e` after the build; set `PLAYWRIGHT_BASE_URL` to the preview URL for deployed checks. Protected Vercel previews may require an authorized access mechanism for automated testing.

The database SQL security suite is in `supabase/tests/security.sql`. The real Auth/REST test script requires privately provisioned synthetic accounts in ignored `.test-accounts.json`; do not run it against production. `docs/live-database-tests.json` records the completed development Auth/REST checks. Browser assertions, SQL policy assertions and direct Auth/REST checks cover different boundaries; report their results separately.

When changing schema, add a new migration rather than editing applied history. Review Row Level Security, geography, publication requirements and import preservation together. Recheck Supabase security/performance advisors and relevant tests after changes.

## Operations and recovery

Keep the existing prototype available during review. Preserve an authorized browser export before migrating personal changes. Database recovery uses the project's configured backups and migration history; a source-code redeploy does not undo database changes. Review plan-specific backup and restore settings before production use. Export only the required private records and store them with access limited to the team.

If a preview fails, retain the failed deployment logs, fix the development branch and create another preview. Do not overwrite an existing production project to resolve a preview failure.

