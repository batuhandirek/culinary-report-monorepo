---
name: integration-test
description: Run, update and write the black-box user-journey suites (`apps/backend/src/tests/integration/*.integration.spec.ts`) against a live backend, and use them to seed the dev database. Use when a change touches a flow a journey drives (signup, verification, login, sessions), when a journey fails, or when adding one.
---

# Integration (user-journey) tests

A journey drives a live server through the generated client the way the apps do: only `client` and the helpers in `src/tests/integration/helpers/`, never the database or app modules. They are **not** in `npm run backend:test`, so nothing else notices when one goes stale.

## Running

- `npm run backend:test:integration [-- <suite>]`: clones the dev DB, builds, boots the server on :3010 with notifications off, runs there. Nothing stays.
- `npm run backend:test:integration:local [-- <suite>]`: against the running dev server (its `PORT`, `VERIFICATION_DEFAULT_CODE` from `env/server/.env.local`). What a run does stays in the dev DB: this is also how to seed a scene to click through.
- A journey that uses admin steps or reused accounts needs `INTEGRATION_ADMIN_EMAIL` / `INTEGRATION_ADMIN_PASSWORD` (read from the env file in both modes).
- Editing anything under `apps/backend/src` while a `--local` run is going restarts the dev server (nest watch), and the run dies with "No dev server answering". Edit between runs.

## Which journey covers what

| Suite | Flows it drives |
|---|---|
| `auth-journey` | email signup with a code, mobile number verification, `GET /auth/me`, session listing, logout |
| `portal-login` | an admin invites `it-portal-owner@example.com` from a prospect (the first, by name, whose venue has a report), the code login, `GET /auth/me` listing the venue, the portal's venues and months, 403 on another venue, the 12-month series. Leaves the owner a member: a seed for clicking through `/portal` |

## Keeping them current

- **A change to a flow in the table updates that journey in the same change, and runs it** (`--local` is enough). A journey that fails afterwards is part of the change, not a follow-up.
- **Assert what the API returned, not a constant a config or rule can move.**
- **When a journey fails, find which side moved before fixing either.** A rule that changed on purpose (git log of the code it exercises) means the journey is stale; otherwise the code regressed. Say which in the change.

## Writing one

- Accounts: `reuseVerifiedUser(label)` gives the same `it-<label>@example.com` every run (found through the admin users list, `findUserByEmail`), so runs add no accounts; `createVerifiedUser` for a journey that needs a blank one. Labels are per journey.
- A reused account carries what earlier runs left: clear at the start what the assertions depend on, and find rows by the ids this run made, never by list position.
- `waitFor` polls what async workers write; `loginAdmin` is one login per run.
- `it` blocks are sequential steps of one scenario sharing state. A journey meant as seed prints the accounts it leaves (`afterAll`).
