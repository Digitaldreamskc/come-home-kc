# Legacy migration and reconciliation

The original source is preserved under `legacy/` and in the untouched sibling `launch-kit`. The old local-storage dataset includes `schema_version`, `program_id` and six arrays: employers, candidates, demands, matches, outcomes and tasks. Stable IDs and each original JSON record are retained.

The starter file contains 21 employer/ecosystem records. It is not a hiring-partner list. Each becomes a draft/research organization and a private employer-conversation record, retaining contact, relationship category, notes, next action, owner, evidence link and the complete original payload. Geography and hiring authority remain unverified. An administrator separately reviews any public profile. Dates and unmapped fields stay in the original record until reviewed.

Tasks become private tasks. Candidate, demand, match and outcome records in an authorized browser backup are preserved in import review records pending identity, consent and relationship mapping. No private browser data or Google Forms responses are fetched automatically.

## Import

1. Download the actual JSON backup from the old dashboard in the browser that contains the desired changes.
2. Run `node scripts/import-legacy.mjs backup.json --dry-run report.json` to validate counts and duplicate IDs.
3. Confirm the isolated target database. An admin can call `import_legacy` with `source_data` and `source_name`; the admin import screen uses this RPC. The optional CLI `--apply` requires a server-only service key and `CONFIRM_ISOLATED_DATABASE=yes`.
4. Review the resulting batch report: original, imported, duplicate, review, missing-information and failed counts. All source records must reconcile.
5. Repeat imports with identical content reuse the batch. Existing identities with changed payloads are held for review; nothing is overwritten. Manual edits to newer records are preserved.

Import creates no public candidate data, verified employer memberships or active jobs. Source snapshot batches, per-record dispositions, identity mappings and audit entries are private. For cross-system integration later, review identity links into Social Balances rather than copying private tables wholesale.

## Verified development import

Applied to `fgmduywfdlvomgbnibzk` (come-home-kc-development): 21 organizations, 21 corresponding private conversations and 5 tasks from 26 source records. A repeated import left organization count at 21. All 21 organizations still require location and participation verification. An earlier review published names as research directory entries. The public directory no longer renders those imported prospects. Only an organization with confirmed permission is shown. Contact names, source notes, next actions and full source records remain private. This is a code change; the hosted rows are not edited here. No jobs were invented or activated.

Migration versions are copied from Supabase's actual migration history. The CLI was attempted first but could not create its home configuration directory under the current filesystem permissions; remote MCP applied the isolated migrations and returned their exact versions. No timestamp was invented.
