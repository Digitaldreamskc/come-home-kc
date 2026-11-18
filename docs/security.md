# Security and permissions

Come Home KC uses an isolated Supabase development project. Production Social Balances data and the original public prototype are untouched.

## Authorization

`user_roles` holds operator-provisioned administrator roles. Account metadata is never used to authorize access. Users can read only their own role record; they cannot grant themselves roles. `user_is_admin()` checks the authenticated user against that table through a private helper.

Published organization fields are separate from private employer conversation/contact notes. Public catalog RLS permits published organizations, verified current jobs with future expiration and a verified employer, reviewed resources, reviewed resource eligibility, and published events. Database triggers require a verified work location before activating onsite/hybrid jobs and explicit eligible states for remote jobs. Changing a work location returns its active job to pending review. Geography is explicitly recorded in organization locations, job locations, remote eligibility and resource eligibility. Unknown geography remains unknown.

Candidates can read, edit and export their own profile. Administrators can review profiles. Employers cannot browse candidate profiles. Communications consent is separately recorded by purpose, date and policy version; profile permission changes append consent history. A general introductions preference does not approve a specific introduction. Facilitating an introduction requires both approvals, sharing scope and permission evidence.

Organization membership is granted and verified by an administrator. Only verified members of a verified organization can submit/edit that organization's jobs. An employer edit returns a listing to pending review and clears verification, except that closing remains closed. Changing organization ownership is rejected. Candidate and employer account signup does not automatically grant privileged roles.

## Intake and abuse controls

`submit_intake` requires a signed-in user with a confirmed email, validates the request kind and bounded JSON payload, checks the honeypot, derives the email from Auth, deduplicates repeated payloads and limits each account to ten requests/hour using an atomic database counter. Next.js handlers additionally validate allowed fields and same-origin requests. There is no anonymous candidate/profile search or anonymous direct insert policy.

The private helper deliberately uses definer rights to write a pending submission after checking identity and bounds. Public wrappers are invoker functions. Private functions use an empty fixed search path and explicit grants. No Supabase server secret is needed in browser code.

## Administration and audit

Sensitive changes append table, record identifier, operation, actor and changed field names to audit history. Audit avoids duplicating personal content. Admin review must approve publication and employer membership explicitly. Import snapshots and conflict reports retain original records; imports never overwrite previously mapped records. Admins should archive public records instead of deleting history.

Uploads are not enabled in this MVP, so there is no publicly readable file bucket. Portfolio links are optional profile fields. Deletion requests enter the private review queue; administrator fulfillment must include linked records and Auth-session handling. Public impact claims require separate approval and evidence.

## Verification

`supabase/tests/security.sql` runs synthetic users through anonymous, ordinary authenticated, candidate, employer and administrator roles in a transaction and rolls back all data. It checks privacy, expired jobs, self-promotion, cross-org writes, consent history, email derivation and employer review resets. Actual execution results are recorded in the delivery report; presence of this file alone is not a passing test.

Before public production release: configure approved Auth redirect origins, delivery email, admin accounts, account deletion procedure and retention policy; run Supabase advisors and browser/account tests in the deployed environment. No real person is provisioned or granted admin without a verified account and explicit operator action.
