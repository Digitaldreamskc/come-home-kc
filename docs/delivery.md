# Come Home KC 2.0 delivery — November 17, 2026

Repository: https://github.com/Digitaldreamskc/come-home-kc
Draft PR: https://github.com/Digitaldreamskc/come-home-kc/pull/1
Branch: codex/come-home-kc-2.0
Tested and deployed code commit: dc8071f934d1d7cd835e45cad82f547cc32f0611
Preview: https://come-home-kc-2-preview-7s2pjhyje-mary-5617s-projects.vercel.app
Deployment: dpl_8nmi5uyL1VajS5U1vUPLdnCYzgJ5, READY, API target staging (preview).
Database: come-home-kc-development, fgmduywfdlvomgbnibzk, Digitaldreamskc.

## Verification

Clean locked installation, full ESLint, TypeScript and production build passed. 11 unit tests, 11 browser tests and 13 real Auth/REST checks passed. Deployed smoke checks passed: catalog, mobile layout, candidate sign-in/profile save/sign-out, anonymous admin denial and candidate admin denial. No browser exceptions; no error/fatal runtime log records returned for the checked deployment window. Public screenshot visually reviewed. SQL security/geography checks are recorded in database-verification.json.

Migration preserved 26 original records: 21 employer conversations and five tasks. 21 name-only research directory entries; two verified workforce resources; zero advertised jobs. Temporary synthetic accounts were removed after testing. No New2KC responses or private browser backups were imported.

The first Vercel request was unexpectedly marked production and canceled before completion. The successful deployment is staging/preview. The original production prototype and domains are unchanged.

## Next steps before production

1. Set approved Auth redirect origins and email delivery; create and verify Mary and Jessica's accounts, then assign administrator roles.
2. Enable leaked-password protection where supported; confirm retention, deletion fulfillment and recovery procedures.
3. Review the preview together, confirm employer participation and actual work locations, and add genuine openings through review.
4. Approve production release separately.

Production readiness: No. This is a tested development preview with the above operating setup outstanding. The preview retains Vercel access protection; owner sign-in or a temporary share link is required.
