# Come Home KC source and environment audit

Reviewed November 17, 2026. This document records read-only inspection before the 2.0 implementation. It does not authorize modifying production.

## Existing prototype

- Public address: https://back2kc-come-home.vercel.app/
- Vercel project: `prj_D20iz64OfZDAooS4yU2uIWXAjRTN`, name `back2kc-come-home`.
- Vercel team: `team_NIJZCvM0nHEip6bfXxMNXlfO`.
- Production deployment inspected: `dpl_9NxFk7nPhjm3vtoL1f3ATWvih2SB`, READY.
- Project reports `framework: null`. Deployment inspection requesting Git information returned no Git source.
- Conversation deployment history confirms direct upload of local HTML/CSS/JavaScript files to Vercel, rather than a Git-connected deployment.
- Authorized source is present in `../launch-kit/dashboard/`: `index.html`, `styles.css`, `app.js`, `core.js`, `seed.js`, `briefing.js`. This is recovered local source, not a claim to have recovered a missing remote repository.
- The app is buildless JavaScript with browser-local persistence at `back2kc-come-home-v1`. It has no Supabase SDK, server endpoint, shared database or authentication.
- The existing Vercel domain and project must remain untouched during 2.0 preview work. Browser-local changes cannot be obtained from the source files and require an actual user-provided JSON backup before import.

## GitHub discovery

The connected account returned 25 accessible `Digitaldreamskc` repositories. Searches for `come-home-kc` and code references to `back2kc-come-home` found no repository. `Digitaldreamskc` is returned by GitHub as a User account, not an organization.

Related repositories:

- https://github.com/Digitaldreamskc/Back2KC-2026 — separate 2026 event program using React, Vite and Supabase; not the current Come Home prototype.
- https://github.com/Digitaldreamskc/social-balances — existing intelligence system; previous launch-kit integration baseline references its records and permissions. No production integration is presumed.
- https://github.com/Digitaldreamskc/kc-capital-atlas — separate public research application.

The preferred `Digitaldreamskc/come-home-kc` name had no accessible conflict in the initial searches. During implementation the user created https://github.com/Digitaldreamskc/come-home-kc. Connector verification returned repository ID `1461974071`, default branch `main`, size 0, and public visibility. Preserve private legacy contact data locally; do not include it in a public source push.

The GitHub connector exposes blob/tree/commit creation, branches, ref updates and pull requests. It does not expose repository creation in the available tool catalog. Repository creation therefore needs an authorized authenticated browser or CLI/API path, or the user to create the empty repository. Do not put this new application on an unrelated production main branch merely to bypass repository creation.

The user-created repository was initialized with a short README on `main`, commit `9501209f77c22e28aa5e714f913f265b7bf3512e`. The isolated implementation branch is `codex/come-home-kc-2.0`. The local `legacy/` snapshot, environment files, temporary test accounts, dependency folders and test artifacts are excluded from the source upload. `scripts/prepare-source.mjs` generates the source-only manifest, rejects detected secret values and binary files, and skips symbolic links. The full application is reviewed on the development branch before any production release.

## Existing data and format

Authoritative starter file: `../launch-kit/integration/initial-data.json`.

- Schema version `1.0.0`, program `back2kc-come-home`, mode `local`.
- 21 employer/ecosystem entries: 15 employer prospects and 6 ecosystem prospects.
- 5 starting tasks.
- Candidates: 0; demands: 0; matches: 0; outcomes: 0.
- Event date `2027-09-17` is explicitly tentative, not an approved event listing.

Employer fields: `id`, `name`, `kind`, `contact`, `hiring_contact`, `status`, `priority`, `owner`, `next_action`, `due_date`, `committed_on`, `external_entity_id`, `source_url`, `source_note`, `source_checked_on`.

Other collections are documented by `../launch-kit/dashboard/core.js`, `app.js` form definitions and `../launch-kit/integration/export.schema.json`. Import must retain raw records as provenance and map each known collection separately. Do not discard incomplete records. No starter entries establish a verified office location, active hiring relationship, public company profile permission or current job opening.

Preserve names, relationship categories, contacts, notes, actions and source links privately during migration. Publish only reviewed company fields after verification. The import report should separate input count, unique source IDs, unchanged repeats, inserted records, conflicts requiring review, missing information and failures. Repeated or older imports must not overwrite reviewed or edited records.

## Related KC Capital Atlas research

Source inspected: README.md and package.json from https://github.com/Digitaldreamskc/kc-capital-atlas.

The README describes a read-only, approved public research projection from Supabase: entities, claims, relationships, events, checkpoints and metrics. It excludes private emails, workbook-only records and internal annotations. The app uses no npm runtime dependencies and deploys changes to main automatically.

This may inform future crosslinks to public ecosystem research. It is not a candidate database or proof of employer participation/current jobs. No Atlas data was imported or changed during this audit.

## New2KC website and form

https://socialbalances.com/new2kc was read successfully. Its messaging includes “Find your people. Know your city.” and the categories Meet People, Explore KC and Build Here. It directs users to community connections and career opportunities. Preserve the welcoming community positioning alongside the 2.0 marketplace.

The web reader could not load the Google Form, but a later TinyFish read-only fetch confirmed the title “New2KC Connection Form,” its description and an email consent statement covering mixers, community events, local opportunities, resources and ways to connect, with unsubscribe language. The extraction did not include every question. The full field list remains described by the user brief: email, name, New2KC relationship/status, interests and preferred next steps. Do not claim independently verified field contents or import submissions from that description. Keep the original link available for community intake and preserve the form and submissions. A later integration should require a scoped authorized export or connector and retain separate permissions for general updates, mixers, opportunities, employer introductions and spotlights.

## Brand evidence

The `Back2KC-2026` README states the approved Back2KC palette is blue `#00AEEF`, gold `#FDB924` and black, with Avant Garde Gothic Pro Medium. It also states no licensed webfont file was supplied. Use available approved logos and a fallback font stack rather than inventing an official font license or brand standard. Approved event assets in that repository are under `public/assets/`; the README identifies `public/assets/brand/kansas-city-hero.webp` as an approved 2000×2000 image.

## Supabase isolation

Connected organization: `Digitaldreamskc`, ID `oedwzeasafkjaazcnzvc`.

Existing active projects relevant to ecosystem context:

- Back2KC: `zxvjrbytsnjlhnhxrilf`.
- Social Balances: `ouszbbdrmoflqhohujib`.
- Social Balances Staging: `qrceiahhnyorqbpbamnl`.
- social-balances-activation-test: `sphegrjhripjdgcckhni`.

These are existing environments; names alone do not authorize reuse or establish that they are empty. Prefer a new isolated Come Home development project. Supabase create-project tooling requires the user to choose the organization and native confirmation of any nonzero cost. A development branch is another isolated option but copies parent migrations and has its own cost flow. No existing database was modified during this audit.

## Reuse and boundary decisions

Reuse the prototype’s source-linked 21-record research pool, explicit consent concepts, introduction stages, evidence distinctions and legacy JSON import contract. Preserve the public production prototype. Build the new application in its own directory/repository and deploy to a separate Vercel preview.

A framework change is justified by server-side validation, authenticated portals, database authorization and shared persistence. A separate Supabase project avoids coupling the MVP to the existing Social Balances production schema. Human approval remains required before publishing listings, sharing candidate details or claiming outcomes.

## Verification limits

The first web reader could not render the prototype, Atlas application or Google Form. A later TinyFish read-only fetch retrieved the prototype’s public introduction/local-storage notice, the Atlas connections view and partial form text. Prototype source/deployment were also inspected via local files and Vercel; Atlas source via GitHub; the planning Google Doc via its connector. Browser/mobile and deployed runtime interaction tests remain implementation tasks and are not implied by page extraction.

## Browser test attempt

Playwright test sources were added for combined state/category/search behavior, verified work locations, remote eligibility, expired listings, keyboard controls, mobile width, errors, job unavailability and anonymous access denial. The first local run could not launch Next.js: `listen EPERM` at `127.0.0.1:3100`. No browser assertion ran in that attempt. Retry once local port permissions are available, or set `PLAYWRIGHT_BASE_URL` to the isolated preview. Do not count the blocked launch as a passed browser test.

The public interaction tests use explicitly synthetic intercepted catalog data, so they exercise filter and layout behavior without publishing invented listings. The access tests call the real application routes and verify unauthenticated denial, login redirects and public response boundaries. These tests complement authenticated database authorization tests; each test result should be reported with the environment actually tested.
