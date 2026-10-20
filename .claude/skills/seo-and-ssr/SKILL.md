---
name: seo-and-ssr
description: Server-side rendering, prerendering, meta tags/canonicals, JSON-LD, OG images, robots/sitemap, indexability, crawlable lists and redirects on the SvelteKit frontend. Use before touching any `+page.ts`/`+layout.ts` `ssr`/`load`, `pageMetaTags`, `og.png` routes, `static/robots.txt`, `(server-only)`, `[...catchall]`, `lib/sitemap.ts`, `modules/sitemap`.
---

# SEO and SSR

## Map

Root `+layout.ts` sets `ssr = false`. Routes: home `+page.svelte`, `auth/`, `(admin)`, `(blog)` (SSR'd for the whole group, `domain-blog`), `(server-only)` (sitemaps), `[...catchall]` (SSR'd 404). `constants/BASE_META_TAGS.ts`, `constants/OG_IMAGE.ts`, `lib/api.ts` (`createLoadApi`), `lib/sitemap.ts`, `components/SafeJsonLd.svelte`. Backend `modules/sitemap`.

## Rules

- **SSR is opt-in per route, and an SSR'd route declares its own `pageMetaTags`.** Re-enable with `export const ssr = true` on the `+page.ts`. A `+layout.ts` that turns SSR on turns it on for every child: private children set `ssr = false` again, or they render logged-out on the server and never match the client.
- A layout's `load` under the root's `ssr = false` never runs on the server, so its data is missing from `page.data` in the server render: an SSR'd page that needs data loads it itself. `LayoutStore` starts at `width = 0`, so SSR always renders the mobile branch. Server routes build their client with `createLoadApi(fetch)`; the `api` singleton's global `fetch` throws on a relative `PUBLIC_API_URL`.
- **Meta tags**: `BASE_META_TAGS` is merged under every route's `pageMetaTags`, so a route states only what is its own, but always `canonical` and the OG `url` / `title`, or it declares itself a duplicate of the homepage. Title template is `%s | Culinary Report`; only the homepage leads with the brand; OG/Twitter titles drop the suffix (`og:site_name` carries it). Every page has its own title from its `+page.ts` (or section `+layout.ts`); private pages add `robots: 'noindex, nofollow'`. Verify with `curl`, not devtools. A private page reached by link and SSR'd for its preview (`/r/[token]`, a shared report) keeps the `noindex` and stays out of `robots.txt`, so a crawler that gets the URL can read the `noindex`; its load must not have side effects (count views from `onMount`), since previews and the server render run it.
- **Crawlable lists seed `SlideFetcher`'s `initialItems` / `initialTotalItems` / `initialPage` from the load.** Never gate the seed on `browser` (universal loads re-run on the client and a `!browser` guard hands it a null seed). Only seed a URL with no filter/sort params, since a seeded page is never refetched. Page size, `populate` and sort must match the component's.
- **Social cards are `og.png` server routes** (satori), one per shareable entity. Satori renders statically: plain flex, literal colours, no tokens or interactive components. A remote `<img>` needs explicit pixel `width` / `height`, and stored ImageKit URLs already carry `?updatedAt=…`, so append transforms with `&tr=`, or satori silently drops the image.
- JSON-LD holding user text renders through `SafeJsonLd` (`svelte-meta-tags`' `JsonLd` does not escape `<`).
- **The sitemap is sections.** A backend module with public pages registers a `SitemapSection` (`name` of lowercase letters, `count`, `list`) with `SitemapService.register` in its `onModuleInit` (`BlogService` registers `blog` and `blogtags`); `/sitemap.xml` lists `sitemap-static.xml` plus `sitemap-<name>-<page>.xml` per page of every section. Static public pages go in `sitemap-static.xml`.
- **`static/robots.txt` and the sitemaps must agree**: a disallowed URL is never submitted. Unknown URLs answer 404 on the server through `[...catchall]`.
- In-page jumps go through `lib/hash-jump.ts`, not a bare `href="#id"`.
