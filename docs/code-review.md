# Code review — November 17, 2026

Reviewed account handlers, administrator forms, login, publication guards, and row-level permission definitions.

## Corrected locally

- Administrator load/save requests now catch connection and JSON-response failures and release busy/loading state. Failed saves retain the form.
- Employer membership lookup errors now return a service error instead of an empty membership result.
- Sign-out now checks the authentication provider result before reporting success.
- Login/signup catches unexpected connection errors and releases the disabled buttons.

## Verification status

Clean installation in a local temporary workspace completed successfully after restoring network access. Full ESLint and TypeScript checks passed. All 11 unit tests and all 11 browser tests passed, with zero failures or skips. The production build completed. The 13 real Auth/REST checks passed again against the isolated development database.

Browser testing found and resolved a real origin-check bug: Next.js normalized the internal loopback hostname differently from the browser-facing Host header. Same-origin validation now uses the request Host and protocol; regression tests reject foreign, missing and insecure origins. Employer select controls now have explicit accessible labels. Two test configuration/locator issues were also corrected.

## Remaining release work

Complete authenticated browser tests, configure Auth redirects and delivery email, provision verified administrator accounts, and resolve the previously reported disabled leaked-password-protection setting. Full personal-data exports and deletion fulfillment still require the documented operator workflow. No deployment was performed in this review.
