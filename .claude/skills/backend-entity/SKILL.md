---
name: backend-entity
description: Create or modify a MikroORM entity / DB schema (entity registration, migration creation and ordering). Use for any change to *.entity.ts, embeddables, or database columns/relations.
---

# Entity / schema change

1. Edit or create the entity in `<module>/entities/*.entity.ts`. Extend `MikroOrmEntityAbstractClass` (`src/shared/abstractions/`) — or `StateMachineEntityAbstractClass` (`src/modules/fsm/abstractions/`) if FSM-driven.
2. **Register it** in the `entities` array of `apps/backend/src/mikro-orm.config.ts` — there is no auto-discovery; forgetting this fails only at runtime.
3. Generate the migration from repo root: `npm run migration:create:dev`, then apply: `npm run migration:up:dev`. Always via these root scripts — the migration output path is CWD-sensitive. **Run `migration:up:dev` first if `migration:pending:dev` lists anything**: `snapshot: false` makes the generator diff the dev database, so a pending migration's columns get emitted a second time (and would fail at boot).
4. **Never edit files in `src/migrations/`** — fix the entity and regenerate instead. Review the generated migration before applying; drop unrelated diff noise by fixing the entity, not the migration. Known exceptions where you edit/delete the generated file itself:
   - **`embedding` halfvec noise**: MikroORM reads a `halfvec(3072)` column back as a dimensionless `halfvec` and may re-emit `alter column "embedding" type halfvec(3072)` for it (the column already is). Delete those statements; a migration containing nothing else should be deleted outright.
   - **Renaming a table or column**: the generator emits drop + create, which loses the data. Write the migration by hand instead (`Migration<timestamp>_<name>.ts`, a comment saying it is hand-written, `rename to` plus the renamed constraints and indexes, e.g. `Migration20261018051442_rename_reviews`), then check `migration:create:dev` reports no changes. Hand-written data migrations (`_seed_berlin`) follow the same shape. A constraint or index a hand-written migration creates must carry the name MikroORM would give it, or the entity must name it explicitly (`@Unique({ name })`): Postgres cuts a name over 63 characters at the end, MikroORM shortens it with a hash (`…_ded6c_unique`), and the mismatch makes every later generated migration drop and re-add it. `npx mikro-orm schema:update --dump` (in `apps/backend`, `NODE_ENV=development`) shows the diff without writing a file.
   - **pgvector**: the initial migration starts with `create extension if not exists vector`, added by hand because the generator never emits it. Keep it the first statement.
5. Remember: pending migrations auto-run on app boot (`app.module.ts`). A broken migration bricks boot for everyone.
6. If the entity is exposed over the API, update DTOs and run `npm run create:client` (see the `backend-endpoint` skill).
7. Add/extend a `*.pglite.spec.ts` covering the new schema behavior (see the `pglite-test` skill). PGlite builds the schema from entities directly, so tests catch entity/migration drift.
