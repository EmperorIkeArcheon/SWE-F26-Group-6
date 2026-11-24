# NutriGator

A nutrition tracking frontend with a welcome/sign-in page and a home dashboard inspired by the supplied fitness dashboard reference: white cards, a light background, cyan and coral accents, and a simple sidebar.

## Run the frontend

Use Node.js 22.12 or newer. From the repository root:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). The frontend runs without a database or environment variables. Fonts are bundled locally.

Choose **Take a look around**, or use these public demo credentials:

| Email | Password |
| --- | --- |
| `demo@nutrigator.app` | `Track2026!` |

The demo includes login validation, show/hide password, a session that survives reloads in the same tab, sign-out, and responsive navigation. The overview links to sample food diary and goals views. The water card can add glasses up to its sample daily target; this interaction resets when the dashboard reloads.

Without any configuration the frontend runs as the public demo above. Real accounts (below) are switched on by adding a Clerk key.

## Sign-in with Clerk and onboarding

The server already verifies Clerk session tokens (`@clerk/express`). The frontend uses Clerk's browser SDK loaded from Clerk's CDN.

1. Start the database server and API from `server/` via Docker:

   ```sh
   cd server
   docker compose up -d   # PostgreSQL; schema.sql is applied on first start
   npm install
   npm run dev            # http://localhost:3000
   ```

3. Open a new terminal for the frontend then start it from the repository root:

   ```sh
   npm ci
   npm run dev
   ```

## Checks

```sh
npm run lint
npm run build
npx playwright install chromium
npm test
```

Playwright starts the frontend automatically. The browser scenarios run against the demo in desktop Chromium and Pixel 7 mobile emulation, including automated WCAG A/AA checks with axe. `npm run build` also type-checks application code, test code, and configuration. Automated accessibility checks do not replace a manual accessibility audit.

```sh
npm run test:ui
npm test -- --project=desktop-chromium
npx playwright show-report client/playwright-report
```

The layout test captures login and dashboard screenshots under `client/test-results/`. Failure traces and the HTML report are generated locally and excluded from Git. GitHub Actions runs lint, build, and browser tests for frontend changes.

The [test-case table](docs/test-cases.md) follows the supplied spreadsheet columns and maps the implementation to SP1-1, SP1-4, and SP1-5. It also records the unimplemented SP1-2 and SP1-3 cases separately.

## Structure

- `client/`: React, TypeScript, and Vite frontend; styles and local font imports in `client/src/`.
- `client/tests/login.spec.ts`: browser tests for the demo login, validation, sessions, navigation, layout, and accessibility.
- `client/tests/onboarding.spec.ts`: logic tests for onboarding validation and unit conversion (no browser or Clerk key needed).
- `client/src/clerk.ts`: loads Clerk's browser SDK and calls the API with the session token. `client/src/Onboarding.tsx` and `client/src/profile.ts` hold the onboarding flow.
- `docs/test-cases.md`: reproducible manual test cases and automated coverage.
- `server/`: Express/PostgreSQL API with Clerk token verification, managed separately with its own package and lockfile. Root npm commands target the frontend workspace. Run its tests with `npm test` from `server/` (most need the database running).
