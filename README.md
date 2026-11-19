# Come Home KC 2.0

Find your people. Find your opportunity.

Come Home KC connects people with employers, career opportunities and community resources across Missouri and Kansas. The public directory supports combined region, category and search filters. Optional accounts support private talent profiles, employer submissions and introduction requests. Mary and Jessica manage review and follow-up in the administrator workspace.

## Development status

This is an isolated development application. Work is reviewed on `codex/come-home-kc-2.0`; Vercel deployment is preview-only. The existing https://back2kc-come-home.vercel.app/ prototype and its browser data remain unchanged.

The authorized starter import preserved 21 employer/ecosystem relationships and five tasks in the development database. Imported prospect employers stay in the operator workspace. The public employer directory shows only organizations with confirmed permission to appear. It is not a directory of people. Empty job or resource views accurately reflect the information reviewed so far.

## Run locally

Use Node.js 24 and pnpm 12.21.0. Install the locked dependencies, create a local environment file, and supply the development project's public connection values:

```sh
npx --yes pnpm@12.21.0 install --frozen-lockfile
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. `/` is public, `/login` handles accounts, `/portal` contains private account services, and `/admin` requires an operator-assigned administrator role. Supabase migrations must already be applied to the selected isolated project. Account creation alone grants no employer or administrator privileges.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The browser suite starts the production build on port 3100. Set `PLAYWRIGHT_BASE_URL` to test another running environment. Use a supported Chromium installation or `npx playwright install chromium`; see the Playwright configuration for optional executable selection. Browser tests include synthetic public catalog fixtures and real anonymous API checks. Authenticated database tests are reported separately.

## Documentation

- [Architecture and data boundaries](docs/architecture.md)
- [Mary and Jessica's operating guide](docs/admin-guide.md)
- [Deployment and account setup](docs/deployment.md)
- [Migration and import guide](docs/migration.md)
- [Security and permissions](docs/security.md)
- [Public interface and state filtering](docs/public-interface.md)
- [Source audit](docs/audit.md)
- [Known limitations and roadmap](docs/roadmap.md)

`supabase/migrations/` is the ordered migration history. `schema.sql`, `intake.sql` and `import.sql` explain the original schema components; do not replay these on top of the migration history. The pnpm lockfile is committed. Private legacy snapshots, environment values, test accounts and browser artifacts stay outside the repository.

## New2KC connection

The public Get Connected link opens the existing [New2KC connection form](https://docs.google.com/forms/d/e/1FAIpQLSfnWTbHNmGrOPfWz_tdE9hk7dEjGWouoVOy1PGzN967kufAWA/viewform). Existing responses remain in that system. A future integration needs an authorized export or connector, deduplication, and separate permission mapping before importing any response.

