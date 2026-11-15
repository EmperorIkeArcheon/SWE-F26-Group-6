# NutriGator

A nutrition tracking app with Clerk sign-in, a first-time onboarding flow, and a home dashboard inspired by the supplied fitness dashboard reference: white cards, a light background, cyan and coral accents, and a simple sidebar.

## Set up and run

NutriGator signs people in with [Clerk](https://clerk.com). The React frontend gets a session token from Clerk and sends it to the Express server, which verifies it (`server/middleware/auth.js`) and stores each user's profile in PostgreSQL. You need Node.js 22.12 or newer and Docker (for Postgres).

**1. Clerk.** Create an application in the Clerk dashboard with email sign-in enabled and copy its publishable and secret keys. The frontend and the server must use the same Clerk application.

**2. Server** (`http://localhost:3000`):

```sh
cd server
cp .env.example .env        # fill in DATABASE_URL, USDA_API_KEY, and both Clerk keys
docker compose up -d        # creates the tables from schema.sql on a fresh database
npm ci
npm run dev
```

If your database already existed before the `name` column was added, run `psql "$DATABASE_URL" -f migrations/001_add_user_name.sql` once.

**3. Frontend** (`http://localhost:5173`), from the repository root:

```sh
npm install @clerk/react --workspace client   # first time only; adds the dependency to package.json and package-lock.json
cp client/.env.example client/.env.local      # set VITE_CLERK_PUBLISHABLE_KEY
npm ci
npm run dev
```

Without a publishable key the app shows a short setup message instead of the sign-in page.

## How sign-in and onboarding work

1. Signed-out visitors see Clerk's sign-in / create-account form on the welcome page.
2. After signing in, the frontend calls `GET /profile` with the Clerk token. The server creates the user's row on first request.
3. If the profile is incomplete, the person goes through a three-step onboarding: **About you** (name, age, sex), **Your body** (height and weight, imperial or metric), and **Your goal** (lose, maintain, or gain). The frontend converts to cm and kg and sends everything to `PUT /profile`, which validates it again on the server.
4. Once the profile is complete, the dashboard opens. **My goals** shows the calorie and macro targets from `GET /profile/goals`. Returning users skip onboarding.

The food diary, weekly chart, and hydration card still use sample data; food logging is not connected yet.

## Checks

```sh
npm run lint
npm run build
npx playwright install chromium
npm test
```

Playwright starts the frontend automatically, with no Clerk key, in desktop Chromium and Pixel 7 mobile emulation. The browser tests cover the setup screen (including an axe accessibility check); the form-logic tests cover unit conversion, validation, and payload building. Signing in with a real Clerk account and onboarding are covered by the manual cases in the [test-case table](docs/test-cases.md). Automated accessibility checks do not replace a manual accessibility audit.

```sh
npm run test:ui
npm test -- --project=desktop-chromium
npx playwright show-report client/playwright-report
```

Server tests need the database from step 2: `cd server && npm test`.

GitHub Actions runs lint, build, and the browser tests for frontend changes.

## Structure

- `client/`: React, TypeScript, and Vite frontend; styles and local font imports in `client/src/`.
- `client/src/Onboarding.tsx`, `client/src/profileForm.ts`, `client/src/api.ts`: onboarding wizard, its pure validation/conversion logic, and the authenticated API client.
- `client/tests/`: `auth.spec.ts` (setup screen) and `profileForm.spec.ts` (form logic).
- `docs/test-cases.md`: reproducible manual test cases and automated coverage.
- `server/`: Express/PostgreSQL API with Clerk authentication, managed separately with its own package and lockfile. Root npm commands target the frontend workspace.
