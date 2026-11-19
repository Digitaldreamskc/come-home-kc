# Public interface and regional filtering

The public marketplace lives at `/`, with job details at `/jobs/[id]`. Browsing does not require login. The directory requests `/api/catalog` with `cache: no-store` and renders an explicit retry state on failures. It never substitutes synthetic fixtures or the old local seed for unavailable database data.

The `region` query value is `all`, `MO` or `KS`. `category` is `talent`, `resources` or `employers`; `q`, `industry`, `city` and `work` retain search preferences. Changing one selector preserves the other. Region is also saved under the new browser key `come-home-kc-region`; the original prototype's storage is untouched. An explicit URL region takes precedence over the saved value. The Share view control copies the current filter URL.

MO/KS filtering uses verified organization offices, verified actual job locations, explicit remote eligibility, or verified resource eligibility. Headquarters and names never supply regional eligibility. Research-only public organizations with unknown office locations appear in All KC with an awaiting-confirmation label, but do not appear in either state-specific view. Jobs require a published verified employer, active status, verification date, valid application URL and future expiration date. Resource eligibility must identify a confirmed state. Events must be published, verified, in the future and have an RSVP link.

Public records are filtered server-side through database policies and checked again in the browser. These browser checks improve presentation; database authorization remains the security boundary. Candidate data is not a public catalog entity.

## Brand source

The existing `Digitaldreamskc/Back2KC-2026` README identifies Back2KC blue `#00AEEF`, gold `#FDB924`, black and Avant Garde Gothic Pro Medium. This interface uses the blue and gold as accent surfaces with dark, high-contrast text. No licensed webfont is shipped; the font stack falls back to Arial. The typographic Come Home KC title is a project heading, not a newly claimed official logo. New2KC public copy and pillars were reviewed at https://socialbalances.com/new2kc on November 17, 2026. No new official brand standards are asserted.

## Accessibility and responsiveness

Region and category controls use labeled groups, pressed states, native buttons and arrow/Home/End navigation. Public pages include a skip link, visible focus, named controls, status messages and full keyboard operation. The details dialog uses the native modal dialog. CSS adapts grids and forms to a 390px mobile viewport; reduced-motion settings disable animation. External links specify new-tab behavior in accessible text.

## Testing

`tests/filters.test.ts` contains deterministic geographic, expiration, public-status, unsafe-link and combined-filter tests. `tests/e2e/public.spec.ts` tests the public browser journeys using explicitly synthetic intercepted catalog responses. These browser fixtures do not establish database persistence or authentication; database and account journey verification must be reported separately.
