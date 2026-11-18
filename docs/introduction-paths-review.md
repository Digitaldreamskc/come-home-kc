# Find your path: local review implementation

This is a working synthetic UI/UX demonstration, not a production relationship service. It implements the supplied path-discovery specification in the existing Back2KC visual system. The attached charts are product context; the Roots screenshots are functional references, not branding or permission to use those people's data.

## Local entry and boundary

Open `/find-your-path` on localhost with `ENABLE_LOCAL_DEMO=1`. Page and API refuse non-local hosts and Vercel execution. No real profiles, contacts, relationship imports or messaging services are loaded. The existing candidate, employer, job-introduction and outcome flows remain unchanged.

An opaque HttpOnly, SameSite=Strict cookie selects an isolated server-side demonstration workspace. State is memory-only, expires after two hours and disappears on server restart. Starting another browser session creates separate data. The review-role menu intentionally simulates requester, two connectors, recipient and administrator; it is **not production identity verification**. The API binds actions to the selected role and server-controlled tenant/workspace. It rejects extra tenant/actor fields, cross-origin writes, another workspace's request IDs and out-of-order transitions.

## Consent and verification

- Drafts are visible only to their requester, including exclusion from the team queue.
- Submission separately asks permission to share display name, the edited note and the selected opportunity. Private profile, résumé and skills are excluded.
- Requester email sharing is a separate unchecked option. Recipient email sharing is another independent unchecked option. Contact addresses appear only after the team records an introduction and only to the intended counterpart (and team).
- The team approves connector review. Connector acceptance requires explicit forwarding permission. The team then approves recipient review. The recipient explicitly accepts or declines. Only a team reviewer can record an introduction.
- Clarification notes do not accept an introduction or expose contacts. Connectors can pause their routes. Cancellation, decline, expiry or revoked relationships prevent further handoffs.
- Each relationship stores tenant/workspace ownership, relationship type, participants, confirmation method/date, per-person visibility and willingness, reconfirmation deadline and a private evidence reference. Both participants must confirm, or a team reviewer must verify evidence. Evidence review cannot override privacy choices. One person's later confirmation cannot override the other's refusal.
- Reconfirmation interval starts at 12 months. A request expires after 14 days without an introduction. Events record actor, time and actual state; the timeline never marks a future milestone complete.
- A voluntary LinkedIn URL is stored separately in the synthetic workspace. It is not scraped, shared in introduction context or used to infer a relationship.

## States and UI

Draft → submitted → connector reviewing → connector accepted → recipient reviewing → recipient accepted → introduced → replied → completed. Connector/recipient decline, requester cancellation and expiry are terminal branches. Every state change is checked server-side and recorded in the request history and workspace audit; expiry is recorded in request history.

Path cards show display identity, role, one intermediary, both relationship contexts, source, last confirmation, reconfirmation date and availability. The default is two short routes, with paused/unverified/unavailable routes in an optional details section. Search supports one-path and no-path views. The secondary diagram contains only visible routes. Forms, timelines and consent controls stack on mobile.

The same state model and components accept another tenant/workspace. `PATH_DEMO_CIVIC=1` changes the synthetic destination only when the deployment-controlled tenant is not Back2KC. It remains disabled in Back2KC-only mode. No tenant selector or private relationship export crosses workspace boundaries.

## Before a real pilot

This milestone deliberately does not add hosted schema or migrations. Existing Supabase migrations and RLS are unchanged. Persistent relationship/request/audit tables, real authenticated participant membership, transactional state changes, RLS integration tests, retention and deletion handling, and verified notification delivery must be implemented and validated before accepting real people or relationship evidence. In-memory transition tests are not evidence of database RLS readiness. No provider is activated and no messages are sent by this module.

The existing Gmail delivery activation boundary and deployment hold still apply.
