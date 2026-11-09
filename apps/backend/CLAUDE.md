# Backend Guide

NestJS + MikroORM + PostgreSQL. The product sends restaurants, bars and cafés a monthly report on what social media says about them. The product modules are `cities`, `apify`, `venues`, `social`, `reports` and `pipeline` (`domain-venues-and-reports` skill), `outreach` sells it (`domain-outreach`), `portal` serves it to the venues that bought it, `overview` reads them all for `/admin`, `highlights` publishes a city's month, `food-trends` its quarter of food trends and `landing` the front page's live edition every five days (`domain-venues-and-reports`), `newsletter` keeps the front page's double opt-in e-mail list (`domain-notifications-and-email`), `blog` brings owners in from search (`domain-blog`), and `analyst` answers admins' free questions about the data by querying it read-only (`domain-analyst`); next to them are accounts (auth, users, sessions, notification preferences) and shared infrastructure (email, SMS, OTP, pg-boss, durable workflows on DBOS (`durable-workflows` skill), FSM, sitemap, images, S3, LLM (agents, classifiers, embeddings and the call ledger) and its daily backlogs (`backlog`), Telegram, Turnstile).

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
| `*.gateway.ts` | `gateways/` | socket.io under `path: SOCKET_IO_PATH` (`/api/socket.io`, so the dev proxy and the production router pass it), one namespace each; payloads shared via `sdk` |
| `*.llm-account.ts` | `accounts/` | one agents' provider account (`defineLlmAccount`): its key's config variable and its daily limits, listed in `LLM_ACCOUNTS` |
| `*.classifier-account.ts`, `*.embedding-account.ts` | `accounts/` | the classifiers' and the embeddings' accounts (`defineClassifierAccount`, `defineEmbeddingAccount`): a key's variable, no limits, counted in the ledger |
| `*.agent.ts` | `agents/` | extends `BaseMastraAgent`, zod output schema (`freeText` for an agent whose answer is prose: the analyst) |
| `*.classifier.ts` | `classifiers/` | extends `BaseMastraClassifier`: declared questions (pick one option, score, yes/no) answered by a decision model with probabilities, no text (`@mastra/core/classifier`) |
| `*.tool.ts` | `tools/` | Mastra tools exposed via `getTools()`; made with `defineTool` (`reports/tools/define-tool.ts`), since `createTool`'s own inference over a zod v4 schema goes "excessively deep" for tsc |
| `*.job.ts` | `jobs/` | pg-boss, with `static readonly jobName` |
| `*.workflow.ts` | `workflows/` | an `@Injectable()` class of `@DurableWorkflow()` methods (DBOS, `durable-workflows` skill): multi-step work that spends money or waits; its steps are `durable.step(...)` calls or `@DurableStep()` methods |
| `*.schedule.ts` | `schedules/` | an `@Injectable()` class of `@DurableSchedule(name, cron)` methods: the durable `*.cron.ts`, each firing one visible workflow run |
| `*.queue.ts` | `queues/` | `defineDurableQueue(name, limits)` constants the workflows are enqueued on |
| `*.subscriber.ts` | `subscribers/` | MikroORM `EventSubscriber`, registered in `subscribers` of `mikro-orm.config.ts` (the test harness reuses the list) |

DTOs:
- Controllers define their input/output types as DTOs — always. Reuse a shared shape (`image.output.dto.ts`) inside per-endpoint DTOs.
- **Never hand-map entity fields.** Fetch with `populate` and return `wrap(entity).serialize({ skipNull: true, populate, forceObject: true })` cast to the DTO.
- **The output DTO is the response contract.** nestia builds the stringifier from it, so undeclared fields are dropped on the wire — narrow the DTO, don't hand-map. `skipNull: true` omits nulls entirely (pin the value when the frontend distinguishes null from absent), and a jsonb `@Formula` array types as a single row (pin it too).
- Fields that must never reach a client are `hidden: true` on the entity (`hashedPassword`).

Every agent and classifier call is filed in the `llm_calls` ledger (`modules/llm`, `LlmCallsService`, through `LlmModelsService.recordCall`) with the model that answered, its tokens and dollars, the workflow it ran in and the call context around it (`withLlmCallContext({ cityId, purpose }, fn)`: the pipeline, a reading pass and a backlog set it; set it around any new bulk caller, so `/admin/llm/spend` can say what the spend was for).

Agent models: `getModel()` returns a tier of the roster (`LLM_ROSTER` in `modules/llm`: `'mini'` for volume, `'full'` for what reaches an owner), never a provider; a call may pick a model with `generate(…, { model })`. `BaseMastraAgent` runs it through `LlmModelsService`, which runs the tier's free models (OpenAI's allowance, with `OpenAIAccountsService`'s rotation; then OpenRouter's free model, `OPENROUTER_FREE_MODEL`, spaced to its 20 requests a minute; a busy free model is waited out and tried again), skips a provider that is out of allowance or credit or an account that used its day (each provider account is a `modules/llm/accounts/*.llm-account.ts` file: its key's variable and its daily `requestsPerDay` / `tokensPerDay` limits, counted by `LlmAccountQuotas` from the ledger; `durable-workflows` skill), and returns the model that answered as `res.model`; record that, not the tier, wherever a reading is stored. Only `:free` OpenRouter models count as free; a free model OpenRouter drops (404) is left out, so pick another that lists `structured_outputs` and run the eval on it. Embeddings run on their own account (`EmbeddingsService`, `modules/llm/accounts/*.embedding-account.ts`) and classifiers on theirs (`*.classifier-account.ts`): both are filed in the ledger under it, never held by a limit. Never read a key variable (`OPENAI_KEY_*`, `ANTHROPIC_API_KEY`) or pass a key yourself outside its account file, or that call skips the failover and the daily limits. **Production never pays for an LLM**: outside `llmPaid` the roster's Claude models are left out and a call fails once the free models are out (the user keeps the Anthropic credit for work started by hand). Only such hand-started commands run inside `llmPaid` (the eval's Opus references, rulings and relabels); never wrap a request, job, cron or backlog in it. The exceptions: agents with `paidFallback: true` in their config, which move to their tier's Claude model when OpenAI is out (on `full` before OpenRouter's free model) — only agents the user allowed by name (2026-11-03: `aspect-suggestion`; 2026-11-09: `post-claims`, the one bulk agent, since gpt-5.4's allowance reads fewer posts a day than arrive); and `analyst`, whose choice puts Claude first (the user's call, 2026-11-03: each answer is a question an admin asked, its cost stored on it). **One item per call**: an agent's call answers one item (one review, one post, one source's claims, one wording) with instructions and an output schema made for that one question; never pack several items with ids for the model to sort into sub-answers (packed calls drop items and mix them up). Cost is handled by caching the fixed instructions and by provider batching, not by packing: the instructions hold nothing that differs per item (a venue's or brand's name goes in the message, or every call misses the cache), and a high-volume agent's fixed part (rules, coaching with worked examples, its output schema) passes the 1,024 tokens OpenAI caches from. `getInstructions` is the agent's rules and `getCoaching` (optional) how its model is coached beyond them: the ingestion eval hands only the rules to its reference model (`ingestion-eval` skill). **Classifiers** (`*.classifier.ts`) are the same shape for a decision model (TypeSafe's Jev, `typesafe-ai/<model>`, `DecisionModelsService`): `getQuestions` (each option with what it means) and `getModel`, one item a call in the state. Decision models are paid per call with no allowance, so `DecisionModelsService` serves them only inside `llmPaid`, except a classifier the user allowed in production by name (`paidInProduction`; 2026-11-05: `claim-labels`, every claim's sentiment, aspect and kind, ~$22 a month for Berlin); `TYPESAFE_AI_API_KEY` unset or `LLM_DISABLE_TYPESAFE`, none runs and the claims wait unlabelled. Keep an agent's instructions fixed and its input in the messages: both providers cache the prompt's shared start, Claude up to the marker the base agent puts after the instructions; a tool-calling agent sets `cacheConversation`.

Agent tools: keep the tool file provider-agnostic (a factory returning a `Tool` backed by an injected service). **A tool that costs money per call carries its own call budget in the factory** — the base agent rebuilds tools each `generate`, so a counter closed over in the factory is per-run. Prompt wording is advisory; the factory is enforcement. Cap steps too (`maxSteps` / `stopWhen`; Mastra defaults to 20).

## Events

**In-memory** (`@nestjs/event-emitter`) — real-time, ephemeral, no retry (e.g. WebSocket broadcasts). `events/*.event.ts` + `consumers/*.consumer.ts` using `@OnEvent(EventClass.type)`.

**Persistent** (pg-boss, `src/modules/pgboss`) — fire-and-forget side effects that *must* happen (notifications, emails, indexing). Work with several steps that spends money or waits (a reading pass, a backlog drain, an LLM call, an Apify run) is a **durable workflow** instead (DBOS, `src/modules/durable-workflows`, `durable-workflows` skill): `@DurableWorkflow()` on a `workflows/*.workflow.ts` method, `@DurableSchedule(name, cron)` for its cron, `DurableWorkflowsService.step` around every call that touches the world, `enqueue` / `start` with a `dedupe` key for the durable `singletonKey`. Every Apify actor run is already a workflow of its own on the `apify` queue (`ApifyService.runActor` starts it), and an agent call made through `DurableLlmService.generate` one on its tier's queue (`llm`, `llm-full`, `llm-high`) that waits until an account can serve it; never `Promise.all` over steps, fan out with child workflows. `persisted-events/*.persisted-event.ts` (with `static readonly eventName` + typed payload) + `workers/*.worker.ts` using `@OnPersistentEvent(EventClass.eventName)` for fan-out, or `@OnJob(queueName)` for single-consumer queues. Both need `@EnsureRequestContext` on the method.

- Publish: `pgBossService.publish(name, data)`, or `publishWithEm(em, name, data)` inside an `em.transactional()` for atomicity with entity changes; `publishManyWithEm` for a batch (one insert per subscriber queue). `sendJob` / `sendJobWithEm` for direct queue jobs.
- Changing a payload ⇒ update every handler for that name (grep the static `jobName` / `eventName`).
- `@OnJob(name, { policy: 'stately' })` with `sendJob(..., { singletonKey })` keeps one job waiting and one running per key (`BrandAutoMergeJob`). The policy is set when the queue is created; pg-boss can't change it later, so a new policy needs a new queue name.

## Rules

- **Nothing is released yet, so nothing constrains a contract** (root `CLAUDE.md`): rename or remove routes, fields, enum values and exception codes as the design needs, and make a new header or auth requirement strict from the start.
- **Cross-module data access goes through services.** Never import another module's `*.repository.ts`; expose a service method and export it from the owning module.
- **Never query per item inside a loop that creates or changes entities**: MikroORM's auto-flush checks every managed entity for changes before each query, so a lookup per item is quadratic (a review batch of 12,000 held the CPU for hours; 4,000 took 148 s against 4 s). Load what the loop needs in one query (`$in`, a few thousand ids a chunk), then work in memory and flush once.
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
