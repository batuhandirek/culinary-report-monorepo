# Frontend Guide

SvelteKit 2 + Svelte 5 (runes), web only (adapter-node). The UI copy is Turkish for now, inherited from the codebase this started from.

**The look, dialogs, SSR/SEO, admin, and each domain's screens are in the skills under `.claude/skills/`** (`design-system`, `seo-and-ssr`, `admin-ui`, plus the domain skills; index in root `CLAUDE.md`). Load the matching one before building UI. This file is only what every frontend task needs.

- Use the path aliases, not relative paths: `#ui`, `#components`, `#views`, `#dialogs`, `#stores`, `#lib`, `#constants`, `#assets`. They are Node subpath imports (`imports` in `package.json`), so **write the file extension** — `.js` for a `.ts` file, `.svelte.js` for `.svelte.ts`, `/index.js` for a folder.
- Env comes from `$app/env/public` (declared in `src/env.ts`), sourced from `env/web`.
- **All backend calls go through the `api` singleton in `#lib/api.ts`** — never a hand-rolled `fetch('/api/...')`. Regenerate with `npm run create:client`. The generated client emits a nominal twin type per response shape, so a cast is normal.

## Structure

Routes: the placeholder home `+page.svelte`, `auth/`, the `(admin)` group, the `(portal)` group (the venue owners' portal, `/portal`; English like the reports, `domain-venues-and-reports`), the `(blog)` group (the SSR'd public blog, English, `domain-blog`), the `(highlights)` group (a city's public pages, SSR'd, English, `domain-venues-and-reports`: its month `/<city>/<month>` and its quarter of food trends `/<city>/trends/<YYYY>-q<N>`; the `[city=city]` / `[month=month]` / `[quarter=quarter]` matchers are in `src/params.ts`), `(server-only)` (sitemaps) and `[...catchall]` (a real 404). Site-wide chrome (cookie consent, `#ui/components/Setup.svelte`) lives in the **root** layout — don't re-add it per group.

- `/src/ui` — self-contained design system: `primitives-new/` (direct shadcn imports via `npm run add:component`, keep upstream-compatible), `wrapped/`, `components/`, `lib/`, `types/`. Its living catalogue is `/admin/ui-kit`.
- `/src/views` — page-level components that also embed elsewhere, and the admin table views.
- `/src/stores` — one rune class per `XStore.svelte.ts`. WS stores type payloads with `sdk` event classes, so changing a payload means changing `packages/sdk` for both sides.
- **A component only one route uses lives in that route's `components/` folder** (stores in `stores/`), imported relatively. Layout-only chrome is `routes/components/`. `/src/components` holds only what several routes share; `/src/dialogs` dialogs several routes open (admin ones under `admin/`).
- **A screen that needs data dev rarely has is a fetching shell (`+page.svelte`) plus a presentational view under `components/`** that takes plain data and callbacks, so it can be mounted with any data. `/admin/ui-kit` is the component gallery only; whole-screen fixture pages were removed.
- `/src/constants` — one file per group, UPPER_SNAKE filenames. `/src/lib` — app logic; a `*-status.ts` / `*-event.ts` file is the single source for a domain's wording and which moves exist.

## Coding conventions

- **`svelte.ts` files**: one class per file, state as individual class properties (objects/arrays only for genuinely grouped data), methods as the actions, **arrow functions**. Reference stores: `AppStore` (device detection), `UserStore` (session and exception handling), `AnalyticsStore`.
- **API mutations**: `/src/ui/lib/action.svelte.ts`. **Paginated data**: `PaginatedResultFetcher.svelte`. **Infinite scroll**: `SlideFetcher.svelte`. **Admin tables**: `PaginatedDataTable`. **Forms**: reference `#components/auth/LoginForm.svelte`. **Exceptions**: codes come from the shared `exceptions` package, mapped in `#constants/EXCEPTION_MAPPING.ts`.
- A private route calls `requireLogin()` (`#lib/require-login.ts`) from `onMount`. Every page has its own title via `pageMetaTags` from its `+page.ts` (or its section's `+layout.ts`); a private page adds `robots: 'noindex, nofollow'`.
- Logging goes through `src/ui/lib/logger.ts`.
- After editing a file, check every other place that uses it and fix what broke.
- **Don't reformat a file you are editing.** `npx prettier` and eslint's `prettier/prettier` rule disagree on where a Svelte tag's closing `>` goes, so each rewrites what the other wrote — that is why bracket styles are mixed. Match the file; fix import order alone with `npx eslint --fix --rule 'prettier/prettier: off' <file>`.
- `tsconfig.json` extends `$app/tsconfig`, which SvelteKit 3 generates into `node_modules/$app`. Any `npm install` / `uninstall` prunes it as extraneous, and `svelte-check` then fails with "File '$app/tsconfig' not found": run `npx svelte-kit sync` (dev and build sync on their own).
- Dev server output is `apps/frontend/.turbo/turbo-dev.log`. Create a new file before writing its importer: vite caches the failed import until the importer is touched again.
- Copy is informal second person ("sen"), sentence case, no "Lütfen". Legal texts stay formal and come from the backend as-is.
