# Employer status notifications: implementation and activation boundary

The isolated validation database has `private.employer_status_email_queue`. A status-change trigger on employer verification submissions queues a service notification when a version 2 submission records the verification-service notice, or a legacy version 1 submission includes its explicit verification-contact permission. New submissions do not record a consent checkbox or opt into marketing. The recipient comes from the confirmed Auth account, never from an editable payload email. Application users cannot read or write the queue. Repeating the same status does not add a duplicate event. Queue rows are deleted with the related submission/account.

`lib/gmail-status-email.ts` implements the Gmail API adapter for an explicitly enabled server-side configuration. The approved sender is mary@socialbalances.com. It refreshes OAuth credentials, sends a MIME/base64url message, and returns Gmail's acceptance ID. A stable Message-ID supports reconciliation. It does not automatically retry ambiguous sends and does not treat API acceptance as proof of delivery.

The adapter's network behavior is unit-tested with controlled responses; no email was sent. The queue is currently held in pending_configuration. No scheduled delivery worker is active or deployed, and the application does not import the adapter into client code.

Required before activating delivery:
1. Create or choose a Google Cloud OAuth client for this application, enable Gmail API, and authorize mary@socialbalances.com with offline access and the gmail.send scope. Store client ID, client secret and refresh token only in secure server environment configuration (not chat or NEXT_PUBLIC variables).
2. Configure the approved account-link origin and a server-only queue worker credential scoped to the isolated project. Wire a worker to atomically claim queue items, call the adapter, persist the provider message ID, and hold ambiguous attempts for reconciliation rather than automatically retrying.
3. Run a controlled email to an approved test recipient, verify the sender, inbox receipt and account link, and test status changes, permissions, duplicate processing, retry handling and expired authorization. Enable delivery only after this acceptance check.

The chat Gmail connector is not the application's OAuth credential. No existing Google Cloud project, Gmail settings, production database, or public deployment was modified.

References: https://developers.google.com/workspace/gmail/api/guides/sending and https://developers.google.com/identity/protocols/oauth2/web-server#offline
