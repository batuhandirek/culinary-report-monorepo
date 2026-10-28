# Backend Guide

NestJS + MikroORM + PostgreSQL. The product sends restaurants, bars and cafés a monthly report on what social media says about them. The product modules are `cities`, `apify`, `venues`, `social`, `reports` and `pipeline` (`domain-venues-and-reports` skill), `outreach` sells it (`domain-outreach`), `portal` serves it to the venues that bought it, `overview` reads them all for `/admin`, `highlights` publishes a city's month, `food-trends` its quarter of food trends and `landing` the front page's live edition every five days (`domain-venues-and-reports`), `newsletter` keeps the front page's double opt-in e-mail list (`domain-notifications-and-email`), and `blog` brings owners in from search (`domain-blog`); next to them are accounts (auth, users, sessions, notification preferences) and shared infrastructure (email, SMS, OTP, pg-boss, FSM, sitemap, images, S3, LLM and its daily backlogs (`backlog`), embeddings, Telegram, Turnstile).

**Domain knowledge (entities, invariants, flows, the one entry point for each state change) lives in the skills under `.claude/skills/`** — load the one matching the module before working in it (index in root `CLAUDE.md`). This file is only the conventions every module shares.

Setup gotchas that fail at runtime, not compile time:
- **ESM** (`"type": "module"`, NodeNext): every relative and `src/`-alias import must end in `.js`.
- Entities are **not** auto-discovered — add each new one to `entities` in `src/mikro-orm.config.ts`.
- typia/nestia need a patched TypeScript: run `npm run typia:setup` (root) after a fresh install or `@TypedBody` validation breaks.
- typia inlines DTO types into each controller's compiled JS, but tsc only re-emits a file whose own output it thinks changed, so a changed enum/type a DTO uses leaves unchanged controllers validating the old one (500 "Response body data is not following the promised type"). `build` and `dev` delete `dist/tsconfig.tsbuildinfo` first; watch mode can't — **restart dev after changing a type a DTO uses**.
- `src/main.ts` import order is load-bearing: `./tracing.js` first (OTel patching), `initDotEnv()` before any config-class import.
- Pending migrations auto-run at boot (`SKIP_MIGRATIONS=true` to skip) — a broken migration bricks boot for everyone on the branch.

## Conventions

Filenames are kebab-case. Per module, files live in the directory matching their suffix:

| Suffix | Directory | Notes |
|---|---|---|
| `*.entity.ts` | `entities/` | |
| `*.service.ts` | `services/` | |
| `*.repository.ts` | `repositories/` | one per entity |
| `*.controller.ts` | `controllers/` | admin-only ones are `admin.*.controller.ts` |
| `*.input.dto.ts` / `*.output.dto.ts` | `dto/` | validated by `typia` (interfaces only — no class-validator) |
| `*.cron.ts` | `crons/` | |
| `*.enum.constant.ts`, `*.constant.ts` | `constants/` | |
| `*.config.ts` | `config/` | class-validator env classes; env from `env/server/` |
| `*.gateway.ts` | `gateways/` | socket.io; payloads shared via `sdk` |
| `*.agent.ts` | `agents/` | extends `BaseMastraAgent`, zod output schema |
| `*.tool.ts` | `tools/` | Mastra tools exposed via `getTools()`; made with `defineTool` (`reports/tools/define-tool.ts`), since `createTool`'s own inference over a zod v4 schema goes "excessively deep" for tsc |
| `*.job.ts` | `jobs/` | pg-boss, with `static readonly jobName` |
| `*.subscriber.ts` | `subscribers/` | MikroORM `EventSubscriber`, registered in `subscribers` of `mikro-orm.config.ts` (the test harness reuses the list) |

DTOs:
- Controllers define their input/output types as DTOs — always. Reuse a shared shape (`image.output.dto.ts`) inside per-endpoint DTOs.
- **Never hand-map entity fields.** Fetch with `populate` and return `wrap(entity).serialize({ skipNull: true, populate, forceObject: true })` cast to the DTO.
- **The output DTO is the response contract.** nestia builds the stringifier from it, so undeclared fields are dropped on the wire — narrow the DTO, don't hand-map. `skipNull: true` omits nulls entirely (pin the value when the frontend distinguishes null from absent), and a jsonb `@Formula` array types as a single row (pin it too).
- Fields that must never reach a client are `hidden: true` on the entity (`hashedPassword`).

Agent models: `getModel()` returns an `openai/…` id and `BaseMastraAgent` gets the key from `OpenAIAccountsService` (account rotation and failover); any other direct OpenAI call (embeddings) goes through its `run(model, fn)` too. Never read `OPENAI_API_KEYS` or pass a key yourself, or that call skips the failover.

Agent tools: keep the tool file provider-agnostic (a factory returning a `Tool` backed by an injected service). **A tool that costs money per call carries its own call budget in the factory** — the base agent rebuilds tools each `generate`, so a counter closed over in the factory is per-run. Prompt wording is advisory; the factory is enforcement. Cap steps too (`maxSteps` / `stopWhen`; Mastra defaults to 20).

## Events

**In-memory** (`@nestjs/event-emitter`) — real-time, ephemeral, no retry (e.g. WebSocket broadcasts). `events/*.event.ts` + `consumers/*.consumer.ts` using `@OnEvent(EventClass.type)`.

**Persistent** (pg-boss, `src/modules/pgboss`) — side effects that *must* happen (notifications, emails, indexing). `persisted-events/*.persisted-event.ts` (with `static readonly eventName` + typed payload) + `workers/*.worker.ts` using `@OnPersistentEvent(EventClass.eventName)` for fan-out, or `@OnJob(queueName)` for single-consumer queues. Both need `@EnsureRequestContext` on the method.

- Publish: `pgBossService.publish(name, data)`, or `publishWithEm(em, name, data)` inside an `em.transactional()` for atomicity with entity changes; `publishManyWithEm` for a batch (one insert per subscriber queue). `sendJob` / `sendJobWithEm` for direct queue jobs.
- Changing a payload ⇒ update every handler for that name (grep the static `jobName` / `eventName`).
- `@OnJob(name, { policy: 'stately' })` with `sendJob(..., { singletonKey })` keeps one job waiting and one running per key (`BrandAutoMergeJob`). The policy is set when the queue is created; pg-boss can't change it later, so a new policy needs a new queue name.

## Rules

- **Nothing is released yet, so nothing constrains a contract** (root `CLAUDE.md`): rename or remove routes, fields, enum values and exception codes as the design needs, and make a new header or auth requirement strict from the start.
- **Cross-module data access goes through services.** Never import another module's `*.repository.ts`; expose a service method and export it from the owning module.
- **Keep a request in one transaction**: create with `repository.create`, update by assignment, flush once at the end of the controller method. Wrap entity changes + persistent events in `em.transactional()` with `publishWithEm`.
- **A state change with side effects goes through its owner's one entry point** (e.g. `UserService.updateUserRoles`) — never assign `state` by hand. The domain skills name them.
- Partial indexes with an expression (e.g. on embeddings) only serve a query whose predicate / ORDER BY is verbatim-identical.
- `em.execute` flattens an array bound to one `?` into a comma-separated list, so `= ANY(?)` never binds — expand ids into one placeholder each.

## Testing

- `npm run backend:test` from root (jest ESM + in-process PGlite Postgres). Always via the script — it supplies the ESM node flags. Four recycled workers, ~9 min; never add `--runInBand` (it runs out of heap).
- DB suites are `*.pglite.spec.ts` in the module's `tests/`, using the helpers in `src/tests/` and fishery factories in `tests/factories/`. Details in the `pglite-test` skill. **Any new implementation MUST add PGlite tests.**
- User-journey suites are `*.integration.spec.ts` in `src/tests/integration/`: black-box against a live server, run on demand (not in `backend:test`), also the dev-DB seed. How to run, write and which flow each covers: the `integration-test` skill.
- **Tests move with the code.** A change that alters behaviour updates the PGlite suites asserting the old behaviour, and the journeys driving that flow (the skill's table), in the same change, and runs both. When a test fails, find which side moved before fixing either: a rule changed on purpose means the test is stale; otherwise the code regressed.

## Commands

- `npm run create:client` (root) after **any** endpoint/DTO change — 30-50s, run it in the background or ask.
- `npm run migration:create:dev` / `migration:up:dev` after schema changes — always via the root scripts, the output path is CWD-sensitive.
- Never edit `src/migrations/` — fix the entities and regenerate.
