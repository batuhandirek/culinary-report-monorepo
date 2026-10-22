Culinary Report: monthly social media reports for restaurants, bars and cafés.

Monorepo (npm workspaces + Turborepo):
- `apps/backend` — NestJS. Conventions in `apps/backend/CLAUDE.md`.
- `apps/frontend` — SvelteKit, web only. Conventions in `apps/frontend/CLAUDE.md`.
- `packages/client` — API client generated from OpenAPI. **Generated, never hand-edit.**
- `apps/swagger-build` — client-generation harness; its `src/` is a generated CJS clone of the backend. **Never hand-edit.**
- `packages/emails` — transactional email templates (react-email).
- `packages/exceptions` — error codes shared backend→frontend.
- `packages/sdk` — shared types and socket events. The backend reads its `dist`, which dev's watcher keeps current: its `build` script wipes `dist` first, so don't run it while dev is up (plain `npx tsc` there instead).
- `packages/blog-content` — TipTap schema + JSON→HTML/text renderers behind the `$ui` rich-text editor. Dual-built ESM and CJS. Editing its `src/` means `npm run build --filter=blog-content` — dev's watcher rebuilds ESM only. `happy-dom` (the server-side DOM `@tiptap/html` needs) is its direct dependency on purpose: as a bare peer, npm dropped it from the lockfile.

# Skills (`.claude/skills/`)

The CLAUDE.md files hold only cross-cutting conventions. Everything about a domain — its entities, invariants, flows, quirks, which service is the one entry point — is in a skill. **Load the skill before working in its area**, and when a change alters one of its statements, fix the skill in the same change. A new domain gets its own `domain-*` skill.

- Procedures: `backend-endpoint`, `backend-entity`, `pglite-test`, `integration-test`, `fsm-machine`, `run-app`, `task-workflow`.
- Domains (backend + frontend together): `domain-venues-and-reports` (the product: scraping, matching, reports, the pipeline), `domain-outreach` (selling the report: prospects, the outreach log, follow-ups, email templates), `domain-identity-and-auth`, `domain-users-and-profile`, `domain-notifications-and-email`, `domain-blog` (the public blog and its admin editor).
- Frontend cross-cutting: `design-system`, `seo-and-ssr`, `admin-ui`.

# Notes
- Backend and frontend are served from one node process in production: `/api/*` goes to NestJS, everything else to SvelteKit (`apps/backend/src/main.ts`). In dev the frontend runs on Vite (:5011) and proxies `/api` to the backend (:3015).
- Postgres runs in Docker (`docker/docker-compose.yml`, `npm run db:up`), with its password and port from `env/server/.env.local`.
- Env files (gitignored, `.env.example` next to each): `env/server`, `env/web`.
- **Questions for outside parties are `questions/<party>.md`** (`questions/README.md`): what a provider or vendor must answer, the answer once it comes, the follow-up task slugs. A task's own open questions are only the user's decisions.
- **Plain-language docs for business and sales are `human-docs/`** (`human-docs/README.md`): derived from the skills, never the other way round; a change that makes a statement there wrong fixes it in the same change.
- **Work queue is `tasks/`** (`todo/` → `in-progress/` → `done/`, one file per task naming the skills to load; `tasks/README.md`, `task-workflow` skill). Work found but not done now goes there as a task, never into a root-level markdown file.
- Root commands: `npm run db:up`, `npm run start:dev`, `npm run build`, `npm run backend:test`, `npm run backend:test:integration`, `npm run create:client` (after any endpoint/DTO change), `npm run migration:create:dev` / `migration:up:dev`, `npm run typia:setup` (after fresh install).

# Rules (everywhere)
- **Nothing is released yet, and there is no production anywhere**: no deployed app, no production database or backup. The local dev database is the only data. Nothing depends on today's API, so change routes, DTOs, entities, headers and socket payloads freely — rename, restructure, drop fields, pick the cleaner design — with no compatibility shims; a migration only has to carry the dev data across. The `*:prod` scripts and production code paths are scaffolding for later. Rewrite this bullet at the first deployment.
- Never hand-edit generated artifacts: `packages/client/src/Api.ts`, `apps/swagger-build/src/**`, `apps/swagger-build/swagger.json`, `apps/backend/src/migrations/**`.
- **Keep the CLAUDE.md files and the skills in sync with your changes**: fix statements a change made wrong, add rules it introduced, delete entries once they no longer constrain new code. CLAUDE.md files are auto-loaded on every task, so they stay short and hold only what applies everywhere; a rule about one domain goes in that domain's skill. Write the rule and the reason it exists; leave out history, dated narrative and one-off design decisions.
