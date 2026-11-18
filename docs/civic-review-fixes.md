# KC Now review fixes — November 18, 2026

Implemented all five review items and the smaller wording/style changes. The outlined buttons had accessible labels but white-on-white text; their visible labels, hover and keyboard focus now pass browser checks. Separate requests receive chronological labels in each authorized history; true revisions retain database attempt numbers. No consent records were rewritten.

Interest cards show only interest status, with save/error feedback inline. Known synthetic fixture annotations are mapped only for presentation; arbitrary participant text and versioned consent wording remain unchanged. Journey stages distinguish recorded activity from pending stages; Measure remains not started, and self-reported participation is not treated as verified impact.

Home links name their destinations, the unexplained counter is removed, informational audience/capability tags no longer resemble controls, draft text uses normal weight, cancellation wording is consistent, and expiry states the condition plainly.

Validation: production build, lint, TypeScript and 54 unit tests passed. Five targeted browser tests passed against the local previews and isolated synthetic development data, including the existing persistent introduction flow, reload persistence, named consent and mobile timeline. An initial focus assertion used programmatic pointer focus and failed; it was corrected to exercise keyboard Tab navigation, then the complete targeted suite passed. No schema or authorization changes in this patch; this is not a fresh full security audit.

Measured text contrast: secondary button 11.86:1; hovered secondary button 9.62:1; muted civic text 6.22:1. These checks are not a complete accessibility certification. Screenshots cover 1440px and 390px with no horizontal overflow. Service-error capture uses an intercepted 503 response, clearly separated from actual saved states.

No deployment, production database changes, messages or invitations. Screenshots use synthetic accounts. Existing production-readiness limitations remain in the Phase 3 report.
