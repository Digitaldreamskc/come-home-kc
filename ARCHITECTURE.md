# Architecture

## Overview

Come Home KC is regional relationship infrastructure for Back2KC and New2KC. It helps people discover Kansas City, employers and opportunities, and gives the team a private workspace to turn needs into consented introductions, follow-up actions and evidenced outcomes. Employer partnerships add accountable year-round delivery; they do not purchase access to private talent.

The application is a Next.js App Router / TypeScript monolith backed by Supabase Auth and PostgreSQL. Vercel hosts the application. Public discovery, private account workflows and staff operations share a domain model, not an unrestricted view of one another's records.

## Code map

Use file and symbol search to find these names. This map describes ownership, not an exhaustive route list.

| Area | Where to look | Responsibility |
| --- | --- | --- |
| Public discovery | `app/page.tsx`, `app/marketplace`, `components/editorial`, `components/site-header.tsx` | Explore KC, public catalog, navigation and reviewed employer/community content. |
| Brand and tenancy | `tenants/`, `lib/tenant-config.ts`, `TenantConfig`, `components/tenant-ui` | Deployment-selected tenant identity, design tokens, regional vocabulary and presentation. |
| Account access | `components/account-access.tsx`, `app/login`, `app/signup`, `app/forgot-password`, `app/reset-password`, `app/auth/callback`, `lib/onboarding.ts` | Identity entry, confirmation, recovery and bounded post-auth destinations. Onboarding intent is not an authorization role. |
| Private accounts | `app/portal`, `app/api/portal` | Participant profiles, employer submissions, consent and account-specific requests. |
| Team operations | `app/admin`, `app/api/admin`, `user_is_admin` | Administrator review, intake, relationship records, tasks and follow-up. |
| Partnership operations | `app/partnerships`, `partner_workspace`, `partner_case_queue`, `partner_delivery` | Agreement configuration, commitments, case follow-up, publishing and approved reporting; presentation differs by authorized relationship. |
| Database boundary | `lib/supabase.ts`, `publicDb`, `userDb`, `session`, `supabase/migrations/` | Public versus authenticated clients, session validation, durable schema, grants, row-level policies and database functions. |
| External regional data | `lib/regional-sources.ts`, `approvedResources`, `regionalResearch` | Reads published Jessica's List entries and KC Capital Atlas metrics through their existing public projections. |
| Environment boundary | `proxy.ts`, `lib/platform/preview-access.ts`, `lib/platform/config.ts` | Deployment gating, host and database isolation, and application-mode routing. |
| Verification | `tests/`, `supabase/tests/security.sql`, Playwright | Unit, database permission and browser journey checks; see delivery evidence for actual results. |

The core data model groups organizations and memberships, jobs and geography, community resources/events, candidate profiles and consent, introduction requests and outcomes, submissions/tasks, and evidence/import/audit records. The partnership layer adds agreements, commitments, publication and reporting workflows. Ordered SQL migrations are authoritative; do not reconstruct the schema from UI types or older schema snapshots.

## Boundaries and invariants

- Public discovery reads deliberately published fields; private profiles, conversations, intake and staff notes must not leak into public results.
- Authentication establishes identity; database-enforced roles and organization memberships establish authority. Self-registration and editable user metadata never confer staff rights or verified employer access.
- Staff can review authorized work. Employers can act only within their verified organization; participants control their own private profiles. RLS and constrained RPCs must enforce these boundaries even if UI checks are bypassed.
- Tenant choice is deployment-controlled. Neither a query parameter nor an arbitrary client header may grant access to another tenant.
- Geography, publication and employer verification are explicit. Unknown location, an expired job or an unverified hiring claim is not silently upgraded to a verified opportunity.
- An introduction requires specific consent and human review. A general preference is not permission to disclose a profile. An exploratory meeting is not evidence of a hire, contract or investment.
- Partner reporting is evidence-backed and approved. Sponsorship does not confer hiring privileges; external research metrics describe their source population and are not attributable partner outcomes.
- The protected synthetic review environment is not production. Do not onboard real users or copy fixture passwords into it. The proposed live-account deployment gate is opt-in, host-pinned and requires a separate database; activation and security testing remain release work.

## Cross-cutting concerns

**Security and privacy.** Keep privilege checks close to data access, validate requests, minimize exposed fields and preserve purpose-specific consent. Keep secrets and credentials outside source control. Use the security documentation for implementation details and test cases.

**Evidence and audit.** Preserve source identifiers, import provenance, reviewer decisions, time periods and outcome evidence. Distinguish unavailable data from an empty verified result.

**Integration.** Jessica's List and KC Capital Atlas remain separately owned datasets, consumed through scoped read projections. New2KC's form is an intake source, not the entire intake workflow. Authorized import and permission mapping precede individual follow-up. Social Balances intelligence integration should use scoped, reviewed identifiers and projections; do not assume a shared authentication store or a completed live integration.

**Experience.** Preserve existing approved visual components and tenant branding when composing routes. Keep public discovery simple and expose operational detail only in the appropriate authenticated workspace.

**Operations.** Use the README for local commands and the detailed architecture, security, deployment and migration documents under `docs/` for procedures. The live-account rollout checklist describes remaining activation steps, not a completed production deployment.

This root document is a durable orientation map, not a release log. Revisit it when system boundaries change or during periodic architecture review.
