# 2KC real account rollout

The existing protected synthetic preview remains unchanged. Do not enable real registration on the M1 synthetic database or copy its accounts, passwords or fixtures to a live environment.

## Prerequisites before enabling
- Choose a persistent production hostname and a dedicated, non-synthetic Supabase project with reviewed migrations. Verify tenant isolation, RLS, RPC grants, employer verification and the absence of synthetic/private fixture records.
- Provision Mary and Jessica as individual confirmed or invited staff identities in the selected project. Assign staff permissions using the existing database-authorized mechanism; never trust signup metadata for authorization.
- Configure Supabase Auth email confirmation, custom SMTP, rate limits, password policy, site URL and exact callback allowlist (including the reset-password destination). Send invitations or recovery links to the account owners; never put credentials in source control or logs.
- Set ENABLE_LIVE_ACCOUNTS=1, ENABLE_PROTECTED_PREVIEW=0, LIVE_ACCOUNTS_HOST to the chosen host (no scheme/path), LIVE_ACCOUNTS_SUPABASE_URL to the reviewed project's URL, NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to that same project, APP_MODE=back2kc, and GMAIL_DELIVERY_ENABLED=false. Review all remaining service-side database and connector bindings before deploy; no cross-environment secrets. This mode requires a production deployment. Do not change the synthetic preview's configuration.
- Keep Vercel protection on until security and auth validation is complete. Make only the intended public account environment accessible afterwards; private records must remain protected by app authorization.

## Acceptance
Run npm run typecheck, npm run lint, npm test, npm run build, and browser tests. Verify successful staff login and landing at /partnerships, both staff identities and approved permissions, forgot-password email delivery, same-browser callback and password reset, confirmation email delivery for distinct employer and participant accounts, correct onboarding routes, sign-out, invalid/expired links, and persistence across redeployments. Verify unauthenticated users cannot see private data, participants cannot see other profiles or staff operations, employers cannot access another organization or hiring functionality before verification, and signup metadata cannot grant privilege. Test against the configured real-account environment before onboarding anyone. No public invitations or email delivery until these checks pass.

The review branch prepares source changes only. It does not configure Supabase SMTP or create/reset real credentials, activate production, or grant staff roles.
