# Sprint 1 test cases

The columns match the supplied test-case spreadsheet. Authentication now uses Clerk and a real server profile, so SP1-1, SP1-2, SP1-4, and SP1-6 to SP1-8 are **manual** cases that need the server, database, and a Clerk application running (see the README). Nothing in the Status column has been marked Passed: fill it in as you run each case. Nutrition values on the diary and overview screens are still sample data.

## Test matrix

| Item Number | Test Case ID | Test Case Description | PreCondition | Test Steps | Test Data | Expected Result | PostCondition | Actual Result | Status | Comments |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | SP1-1 | User sign-in with Clerk | Server, database, and frontend running with matching Clerk keys; an account already exists | Open the app signed out; choose Sign in; enter the account's credentials; reload; use Sign out | A Clerk test account | Dashboard (or onboarding, if the profile is empty) opens; session survives reload; Sign out returns to the welcome page | User is signed out | | Not run | The browser test `auth.spec.ts` only covers the no-key setup screen |
| 2 | SP1-2 | Calorie goal equation | Signed in with onboarding finished | Complete onboarding in metric units; open My goals | Age 21; male; 172 cm; 60 kg; maintain | Daily energy target 2,205 kcal; protein 145 g; carbs 316 g; fats 40 g | Goals are calculated by the server from the saved profile | | Not run | Calculation lives in `server/goals.js`; unit-tested in `server/tests/goals.test.js` |
| 3 | SP1-3 | Adding food data to user account | Authenticated user and food logging UI implemented | Select Apple; enter 150 grams; save; revisit diary | Food: Apple; grams: 150 | Food entry is saved for the user and day | Entry appears in user's daily diary | Food diary shows sample meals only | Not implemented | The server has food search/import routes; the frontend is not connected to them |
| 4 | SP1-4 | Sign-in and create-account validation | Frontend running with a Clerk key; signed out | Submit empty fields; enter a malformed email; enter a wrong password; switch between Sign in and Create account | Empty values; `not-an-email`; existing email plus a wrong password | Clerk's form explains each problem; no dashboard opens; the switch changes the form and heading | User stays on the welcome page | | Not run | Field validation is provided by Clerk's hosted components |
| 5 | SP1-5 | Home page, responsive navigation, and accessibility | Signed in with onboarding finished | Open dashboard; open diary; use My goals and Overview navigation; add four glasses of water; repeat at mobile width; check keyboard focus | Desktop and phone-sized viewports | Layout fits the viewport; navigation works; the menu opens and closes on mobile; water stops at 2.5 L; greeting and avatar use the person's name | Dashboard remains usable | | Not run | `auth.spec.ts` runs an automated axe check of the setup screen only; the signed-in screens need a manual accessibility check |
| 6 | SP1-6 | Registration and onboarding | Frontend, server, and database running; no account yet | Choose Create account and register; on step 1 leave fields blank and Continue; fill name, age, sex; Continue; on step 2 toggle units, enter height and weight; Continue; choose a goal; Finish setup; reload | Name: Sam Rivera; age 24; female; 5 ft 8 in; 150 lb; maintain | Blank fields show errors and focus the first one; each step validates before moving on; units toggle keeps entered values; after Finish the dashboard greets "Sam"; after reload onboarding does not return; `GET /profile` shows 172.7 cm and 68 kg | Profile saved in the `users` table | | Not run | Logic is covered by `profileForm.spec.ts` (conversion, ranges, payload) |
| 7 | SP1-7 | Onboarding data is validated by the server | Server running; valid Clerk session token | `PUT /profile` with a missing name, `weight_kg` as a string, age 7, or height 400 | See steps | HTTP 400 with `error` and `fields`; nothing is saved | Profile unchanged | | Not run | Automated in `server/tests/profile.test.js` (needs the database) |
| 8 | SP1-8 | Server unavailable or session expired | Signed in; then stop the server | Reload the app; choose Try again after restarting the server | Server stopped, then started | A "couldn't load your account" screen with Try again and Sign out; Try again loads the dashboard once the server is back | Normal use resumes | | Not run | |

## Reproduce the checks

```sh
npm ci
npx playwright install chromium
npm run lint
npm run build
npm test                 # setup screen and form logic, desktop and mobile
cd server && npm test    # needs the database
```

Test sources: [`client/tests/auth.spec.ts`](../client/tests/auth.spec.ts), [`client/tests/profileForm.spec.ts`](../client/tests/profileForm.spec.ts), and [`server/tests/profile.test.js`](../server/tests/profile.test.js). Use `npm test -- --grep SP1-6` to run only the onboarding logic tests.
