# Administrator access and password recovery

Two owner-authorized administrator accounts were created in the isolated development project. Email verification and personal password selection remain pending; no shared or temporary password was distributed. The account-provisioning Edge Function is disabled and returns 410, with gateway JWT verification restored. Administrator roles live in the protected user_roles table.

The login page includes Show/Hide password and Forgot your password. Recovery requests use Supabase Auth, return a neutral account-existence message, and display delivery/rate-limit failures. A verified one-time recovery session permits password replacement with confirmation and a 12-character minimum. Completion signs the user out. Missing, expired and reused links provide a new-link action. Ordinary sign-in does not reject older passwords solely because of the new-account minimum.

## Supabase settings needed for emailed links

Project: fgmduywfdlvomgbnibzk.

1. Authentication → URL Configuration: set Site URL to the stable branch preview URL shown by Vercel for codex/come-home-kc-2.0. Add this project-scoped preview redirect URL:
   `https://come-home-kc-2-preview-*-mary-5617s-projects.vercel.app/**`
2. Keep the default recovery email link using ConfirmationURL. The app requests `/auth/callback?next=/reset-password`; the callback exchanges PKCE codes before opening the new-password page. The person should open that email in the same browser used to request it.
3. Authentication → Email/SMTP: configure the organization's approved transactional email provider and verify sender delivery to both administrators. Enter provider credentials directly in Supabase, never in GitHub or this application’s public environment variables. The default Supabase email service has recipient restrictions and is not a general production mail relay.
4. Vercel preview protection remains enabled. Open an authorized preview share link in the same browser before using email links, or sign in with an authorized Vercel account.
5. Enable leaked-password protection if supported by the project plan.

The connected Supabase tools do not expose Auth URL or SMTP configuration. A generated recovery link requesting the preview origin was still assigned `http://localhost:3000`, confirming that redirect setup is outstanding. No delivery to the administrators' inboxes has been claimed or tested.

## Validation

ESLint, TypeScript, the production build and 11 unit tests passed. Browser checks covered Show/Hide without changing the value or submitting, recovery requests without an existing password, email-service errors, missing/invalid links, real one-time recovery against the development Auth service, mismatched password confirmation, successful password replacement, sign-out, signing in with the new password and rejection of a reused link. Public/access regression checks passed. One navigation test needed an explicit wait for the destination URL before filling its Email field and passed on rerun.

Email-provider delivery remains a separate configuration check. Recovery logic was exercised using a short-lived synthetic account and an Auth-generated token; it was not represented as a delivered email.
