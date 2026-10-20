---
name: run-app
description: Launch the full stack locally (Postgres, backend, frontend) to verify a change end-to-end. Use when asked to run the app or confirm behavior in the real app.
---

# Run the app locally

Prereqs: `env/server/.env.local` must exist (env is validated at import — boot fails loudly if vars are missing). After a fresh `npm install`, run `npm run typia:setup` once.

1. Infra: `docker compose -f docker/docker-compose.yml up -d` — Postgres (pgvector) on :5440, Jaeger UI on :16686. From-scratch reset: `npm run rebuild:dev` (destroys the volume, rebuilds, migrates).
2. Migrations: `npm run migration:up:dev` (also auto-run on backend boot).
3. Start both apps: `npm run start:dev` (root, via turbo) — backend API on **:3015** (`PORT` in `env/server/.env.local`; the Vite proxy in `apps/frontend/vite.config.ts` targets it), SvelteKit dev server on **:5011** (proxied dev; in production one node process serves both).
4. Verify: UI at `http://localhost:5011`, API at `http://localhost:3015/api/...` (e.g. `/api/health-check`). Traces in Jaeger if `OTEL_IS_ENABLED=true`.
5. Data: there is no production database to copy from (root `CLAUDE.md`); the dev database is the only data, so back it up (`docker exec culinary-report-dev-db pg_dump -U postgres -Fc culinary_report > dev.dump`) before a risky migration.

Notes:
- Backend dev build is `nest build --watch` + `tsc-alias --watch`; first compile takes a while, watch output shows readiness.
