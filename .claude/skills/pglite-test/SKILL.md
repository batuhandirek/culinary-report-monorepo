---
name: pglite-test
description: Write backend tests against the in-process PGlite Postgres. Required for any new backend implementation (rule in apps/backend/CLAUDE.md). Use when adding or fixing backend tests.
---

# Writing PGlite tests

Every new backend implementation MUST ship a `*.pglite.spec.ts`, placed in the owning module's `tests/` directory (`src/modules/<module>/tests/`). No external DB needed — PGlite is an in-process WASM Postgres. (Some older suites still sit co-located next to the code under test; new ones go in `tests/`.)

## Bootstrap

Use `createPgliteTestingModule` from `src/tests/testing-module.js`:
- Pass only the **real providers under test** (plus mocks you assert on — explicit providers guarantee instance identity).
- Everything else is auto-mocked (`useMocker`); tokens ending in `Agent` get `mockAgent()` from `src/tests/mock-agent.js` (its `.generate()` resolves `{ object }` — queue responses per call).
- Repositories and the EntityManager are REAL, wired against the PGlite schema built from the app entity list.
- `beforeAll`: create the harness; `afterAll`: `await harness.stop()`.

Reference specs: `src/modules/notification-preferences/tests/notification-preferences.pglite.spec.ts` (real services, a mocked queue), `src/modules/notification/tests/notifications.controller.pglite.spec.ts` (a controller called directly); for a state machine, `src/modules/fsm/tests/fsm-engine.pglite.spec.ts`.

## Seeding — fishery factories

Seed entities with the fishery factories in `src/modules/<module>/tests/factories/*.factory.ts` (e.g. `userFactory`, `userSessionFactory`), not raw `em.create` calls in the spec. Create a missing factory following `src/modules/auth/tests/factories/user.factory.ts`:

- Factories resolve their EM via `getEntityManager()` (`src/shared/util/em.js`) — a PGlite spec must call `entityManagerManager.setEntityManager(harness.orm.em)` in `beforeAll` or every `build()` throws.
- Spread `...params, ...associations` INTO `em.create(...)` inside the define callback (don't rely on fishery's post-build merge): MikroORM `onCreate` hooks run inside `em.create` and read required props (e.g. a normalized name derived from `name`).
- Pass relations via fishery `associations` (`factory.build(params, { associations: { ... } })`), scalars via params; default required scalars with faker; throw in the define callback if a required relation is missing.
- `.build()` persists into the EM unit of work without flushing — batch several builds and `await em.flush()` once; `.create()` flushes immediately.

Factory usage example: `src/modules/auth/tests/services/update-me.pglite.spec.ts`.

## Rules

- Suites boot PGlite + full schema in `beforeAll` — slow is expected (global 120 s timeout). Prefer one harness per suite, not per test.
- PGlite is single-connection: never run queries side by side inside a suite (pool pinned to 1). Suites run in parallel, each in its own worker with its own PGlite on an OS-assigned port (`maxWorkers: 4`), and Jest recycles a worker past `workerIdleMemoryLimit`: one process for every file (`--runInBand`, which `--detectOpenHandles` also forces) runs out of heap, since jest-ESM keeps each file's module graph. Don't add either flag to the script; pass `--detectOpenHandles` only to a single suite.
- No fake timers — the PGlite socket bridge needs real ones (`apps/backend/jest.config.ts`).

## Keeping suites current

- A behaviour change updates the suites that assert the old behaviour in the same change; a failing assertion is rewritten to the new rule or the code is fixed, never loosened or skipped to go green.
- When one fails, find which side moved before fixing either (git log of the rule): on purpose means the test is stale, otherwise the code regressed.
- Flows a user journey drives also need the journey updated: the `integration-test` skill.

## Running

- All: `npm run backend:test` (repo root). Only via this script — jest needs the ESM node flags.
- One suite: `cd apps/backend && npm run test -- --testPathPatterns <name>`.
