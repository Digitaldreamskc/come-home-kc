# Connected 2KC validation workspace

The shared public entry is `/ecosystem`. Every published and verified employer can have a profile at `/employers/{organization_id}`. Stories, current jobs and events use the existing organization identity. Visitors can explore Back2KC, start the existing New2KC form, or browse Jessica’s published directory recommendations.

## Operating model

Jessica starts in Come Home KC’s existing `/admin`. Its verification controls own employer publication, job publication, event review and verified representative membership. The partnership section adds agreements, contractual commitments, private cases and approved report snapshots to the same authenticated session. Social Balances remains the authority for agency relationships and revenue. An authenticated link into this workspace is sufficient for a Social Balances operator working in both capacities. A common tenant or mirrored nonprofit participant database would grant broader access than this workflow requires.

1. In the team workspace, create and verify a fictional organization. Publish its role and event, and verify its representative membership.
2. Under Corporate Talent Partnerships, onboard the verified employer. Configure the term, amount, contracting-entity label, hiring priorities, activation plan and review dates.
3. Add the agreed commitments individually. Publish a story, associate a verified role or event, recognize the profile, and attach an Atlas observation to the relevant commitment.
4. Participants request a role introduction or private welcome follow-up on the employer profile. Staff review the specific permission. The employer may accept a referred professional request. A welcome participant can receive a published gathering or an approved directory recommendation. The participant records their own outcome. Reporting preserves the reported evidence grade.
5. Staff review and approve deliveries, then issue an immutable period report. The employer sees the approved snapshot and selected public sources. References to completed private cases remain in the reporting database and are excluded from employer disclosures. Revoke permission to stop future referrals or visibility.

## Integration matrix

| Component | Connection and scope | Limits |
|---|---|---|
| Come Home KC | Existing organizations, verified memberships, job postings, events, submissions, introduction requests, introductions, tasks and outcomes. New agreement-scoped commitments, story and asset relationships, case transitions and report snapshots. | All operational data for this release is isolated in the M1 validation project. |
| Jessica’s List | Read-only published listings from its authoritative project. Public discovery and staff selection use the same published projection. Welcome recommendations store only the source ID and resolve its current published fields when displayed. | Zero published listings during review. No record was added to the source directory or represented as an approved recommendation. |
| KC Capital Atlas | The documented public-read RPC returns source-linked metrics. Staff attach a selected observation to an intelligence commitment. Report approval preserves the source URL, subject, definition, value, unit and period. | The available metrics concern foundation assets and income. They do not establish regional hiring trends. Private Atlas engagements are outside the integration. |
| New2KC Google Form | The staff importer is pinned to the supplied form and a single explicitly authorized synthetic response ID. It reads current question metadata, preserves the response ID, submission date, need and email choice, and creates one private review task. | External response ingestion requires server-side Google Forms read authorization and an allowlisted synthetic response ID. The public form’s email choice does not authorize an individual referral. No production responses are imported by default. |
| Newcomer welcome | Signed-in participant requests private follow-up, staff reviews and recommends a gathering, and the participant can report a completed connection. | This validation entry point and the external Google Form have different consent records. No identity matching by name or email. |
| Back2KC | Public navigation links to the existing attraction and homecoming site. | Event attendance, charitable accounting and attendee profiles remain owned by Back2KC. |
| Social Balances | Existing agency operating system remains separately scoped. | No shared identity federation, agency CRM replication, billing sync or participant transfer is part of this milestone. |

## Forms validation configuration

Use the approved isolated validation database. Supply a short-lived server-only Google access token with Forms metadata and response read scopes through the preview environment, and set `NEW2KC_VALIDATION_RESPONSE_ID` to the specific synthetic response cleared by the form owner. The token variable is `NEW2KC_FORMS_READ_TOKEN`. The importer requests one response by ID. It does not list responses, retrieve a CRM export, or infer personal follow-up consent. Expired credentials fail closed. A future recurring integration requires separate ownership, authentication and retention decisions.

## Browser validation on November 26, 2026

Separate Chromium sessions represented the public visitor, a professional, a staff administrator with introduction-review scope, and a verified representative. The browser ran the Next.js application against real Supabase Auth and PostgreSQL in the isolated validation project. The hosted deployment was checked separately with its existing protection enabled.

Staff created West Bottoms Signal Works (fictional) using the existing employer directory. Staff separately verified representative membership, published the calibration-engineer listing and scheduled the welcome visit. From the partnership interface, staff then created the $30,000 agreement, configured its seven commitments, published the workshop story and linked the opportunity, event, recognition and Atlas research. The public visitor navigated from discovery to the employer profile and role.

The participant created a private profile, authorized sharing role interest with this employer and separately requested private welcome follow-up. Staff reviewed both requests. The employer accepted the introduction. Staff recommended the scheduled gathering on the welcome case. The participant reported a completed meeting and a community connection. The database preserved both outcomes as **Reported**, closed the original introduction request and marked both follow-up tasks done. A community connection is not evidence of event attendance. The employer-hosted experience remains scheduled.

Rollback-only database checks exercised source-response replay, the original email permission boundary, staff-only import, private case isolation, revocation and wrong-tenant access. External Forms authorization and a synthetic source response remain outstanding. The direct welcome flow is independently functional.
