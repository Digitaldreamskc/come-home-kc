# Master datasets

| Owner | Canonical records | Application reads |
| --- | --- | --- |
| KC Capital Atlas, Supabase `neoappgyffrlrsfprgju` | `kc_atlas.capital_provider_profiles` keyed by `kc_atlas.entities.entity_id` | `public.kc_capital_discovery()` supplies the Capital Landscape, integrated Atlas, standalone Atlas branch and 2KC staff tools. |
| Come Home KC M1 Validation, Supabase `kxuvmilbvwwcrxiqnftx` | `public.ecosystem_providers` and existing `public.organizations`, `public.job_postings`, `public.events` | The public ecosystem filters published providers. Staff discovery reads the current directory and approved employers, openings and events using the existing tenant and role checks. |
| Jessica’s List, Supabase `rzeentkhtafligzksafw` | Existing independent directory | The 2KC source adapter reads only the approved published directory projection. |

Atlas research, financial metrics, checkpoints, relationships and source claims continue through the established Atlas research projection. Capital discovery uses the provider’s entity ID and keeps source links and documented fields attached to that entity. Source URLs on imported profiles are primarily provider websites. Historical research remains accessible in the Atlas.

## Applications and identities

The public form creates a pending record through `submit_ecosystem_application`. Applicant contact information, intake answers and any uploaded raster logo live in `private.ecosystem_applications`. Staff can record a revision, rejection or approval, with reviewer, dates, notes and identity decision appended to `private.ecosystem_application_decisions`. Approval writes selected public fields into the existing or new canonical provider in the same transaction. Applicant review contacts and logo attachments stay private. No mail is sent.

Approval looks up normalized names, verified aliases and comparable websites in the tenant directory. Staff choose a matched existing listing or document a distinct program. A new listing requires no unresolved provider candidate. The database enforces normalized-name uniqueness and checks candidates again under a tenant-scoped approval lock.

`private.organization_identities` holds stable UUIDs and verified aliases. `private.organization_source_refs` links each identity to an ecosystem, Atlas, employer or Jessica’s List source ID with evidence and a review status. Only one verified identity is permitted per source row. `private.organization_identity_reviews` preserves decisions. The staff reconciliation page reads the source adapters and proposes candidates for human review. AltCap is the initial verified cross-source link. Programs, funds, subsidiaries and successor records remain independently identifiable.

## Staff referrals and source evidence

The partnership Follow-ups view uses published Atlas and ecosystem profiles. `private.case_provider_followups` stores the case ID, canonical provider ID, any known shared organization ID, dated source link, rationale, assigned team member, action and due date. `private.case_provider_followup_history` records progression and evidence. The created task is visible in Team records. The case workflow records a potential resource, staff review, proposed introduction, received permission, made introduction, meeting, opportunity and confirmed outcome as distinct steps. Each advance requires evidence. These controls record human actions; they do not initiate outreach. Case closure or revocation cancels open provider tasks.

## Authorization

Public reads are limited by publication and the existing tenant configuration. The new exposed SQL wrappers are security invokers. Their private implementation functions either enforce staff role and an active session or, for public intake, can only submit validated pending data. The private tables have RLS and no direct grants to browser roles. Case updates also check tenant, case state and the existing introductions reviewer scope. The 2KC server action verifies external Atlas IDs against the published Atlas feed. Supabase cannot enforce a foreign key across projects.

The Social Balances Intelligence System is outside this integration. The milestone contains no shared authentication, database access, import, synchronization or repository changes for that system. Any future integration requires a separately authorized milestone.

## Applying the migration

1. Apply Atlas migration `20261127235855_capital_provider_discovery.sql` after the initial capital provider table exists.
2. On Come Home KC M1 Validation, apply `20261127235854_ecosystem_application_review.sql`, `20261128000020_organization_identity_reconciliation.sql` and `20261128002308_canonical_provider_followups.sql` in order. M1 records the earlier ecosystem master, logo and review migrations under their original hosted timestamps. Keep that applied history intact.
3. Verify the published counts and access checks, then deploy Come Home KC only to its protected preview. Keep hosted registration disabled. Atlas changes are versioned on its validation branch while its existing public deployment remains separate.
4. Run the TypeScript, lint, Node and Playwright checks. Database acceptance checks use fictional records and a rollback. Review the implementation report for the results and remaining limitations.

## Sector operations

`lib/sector-taxonomy.ts` is the reference for the 17 sector labels. SQL migrations mirror those values for database validation and publish the same options to the standalone Atlas. Keep the SQL contracts in parity when updating the TypeScript list. Organizations may have multiple sectors and preserve their legacy industry and specialty text. All-industry service coverage is separate from documented sector specialties.
