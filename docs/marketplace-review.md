# Marketplace usability review — 2026-11-18

Implemented the desktop/mobile screenshot feedback on the existing white-label marketplace.

- Entire role cards are single links with underlined titles, a View role affordance, and hover/focus states. Synthetic cards open labeled read-only role details with applications and introduction requests disabled. Closing details restores keyboard focus.
- Mobile navigation exposes Explore, For employers and Get connected in a native disclosure. Escape closes the menu. Sign in has a verified minimum 44px tap height.
- The persistent regional selector scopes the city options. Region/category changes clear an incompatible city without discarding keyword search. A copied URL containing an incompatible city displays it as outside the region; the no-results state offers a complete filter reset.
- Search uses the shorter “Search jobs or skills” placeholder. The desktop sidebar is wider; location explanation lives under City.
- Metadata uses 13px dark text; badges/helper text are at least 12px. The reassurance line is 16px. The browser regression checks computed metadata size and a minimum 4.5:1 text/background contrast.
- Get connected is available in the hero. A short employer invitation sits above results. The footer explains the relationship between the configured marketplace, brand and community program.
- Clear filters is hidden at the default view. The grid/list control is hidden on mobile. Mobile category numbers and subtitles stay hidden, with tighter region/category/filter spacing.
- Synthetic fixtures include different cities and a long title/employer name to exercise wrapping. They remain clearly marked as demonstrations.

Regression coverage in `tests/e2e/marketplace-review.spec.ts` checks mobile menu destinations, keyboard card activation, safe demo details, focus restoration, region-scoped cities, incompatible-city reset, preservation of search, no-results clearing, long content, computed text size/contrast, and document overflow. Existing responsive tests regenerate screenshots at 1440, 1024, 768, 390 and 375px.

No database schema, RLS policy, provider integration or production configuration was changed in this review pass. Existing isolated-database browser journeys remain part of the validation suite. Full screen-reader certification and real email-recovery acceptance remain separate outstanding work.

Validation: ESLint, TypeScript and production build passed; 15 unit tests passed; 26 browser tests passed with one existing real email-recovery test skipped. Screenshots regenerated at all five required widths, plus mobile menu and demo role details.
