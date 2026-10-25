---
name: domain-blog
description: The public blog — articles and tags, the TipTap editor and its `blog-content` renderer, the SSR'd `/blog` pages, OG cards, sitemap sections, the admin editor at `/admin/blog`. Use before touching `modules/blog`, `packages/blog-content`, `routes/(blog)`, `routes/(admin)/admin/blog`, `views/blog`, `components/blog`, `lib/blog.ts`, `blog.css`, `BlogCtaDialog`.
---

# Blog

Articles that bring restaurant, bar and café owners in from search and end on the pitch for the monthly report.

## Map

Backend `modules/blog`: `BlogEntry` (`content` = stringified TipTap JSON, the editing source; `contentHtml` / `contentText` derived from it on every save), `BlogTag` (M:N, owned by the entry), `BlogService` (the one entry point for every write), `BlogController` (`/blog`: list, tags, tag, entry by id or slug, `POST /:idOrSlug/view`), `BlogAdminController` (`/admin/blog`: list, create, update, state, preview, tag CRUD).

`packages/blog-content`: `blogExtensions` (the schema the editor and the renderer share, including the `cta` node), `deriveBlogContent` (JSON → html + text, run by the backend), `renderBlogHtml` / `parseBlogContent` (the admin's live preview).

Frontend: `routes/(blog)` (index, `[articleId]` with `og.png`, `tag/[tagId]`; own header, footer and `BlogPitchBand`), `views/blog/blog-article-view.svelte` (the article, shared by the public page and the admin preview), `components/blog/` (cover, byline), `lib/blog.ts` (TOC, JSON-LD, tag helpers, same-site links), `blog.css` (`.blog-content`), admin `routes/(admin)/admin/blog` + `views/admin/blog`, `dialogs/admin/BlogCtaDialog.svelte`.

## Rules

- **States**: `DRAFT` → `PUBLISHED` ↔ `DRAFT`; `REMOVED` is the soft delete (restorable as a draft). Only `PUBLISHED` is public; anything else answers 404 on the public routes. `publishedAt` is stamped on the first publish and never moves.
- **The slug is set once from the title at creation and never changes** (stable URLs). Tag slugs come from the name; the editor sends tag *names* and the service reuses a tag with the same slug or creates one.
- **Store the JSON, render on save.** The public page renders `contentHtml` with `{@html}` (admin-authored, trusted); the editor round-trips `content`. Changing the schema in `blog-content` changes the output of the next save only, so existing articles keep their old HTML until re-saved. Inline images arrive as data URLs and are uploaded on save (`uploadInlineImages`); covers are cropped 1200×630 to match the OG card.
- **Views are counted by the client** (`registerView` from the article view, `trackViews`), never in the load: SSR, crawlers and the admin preview must not count.
- **The blog is SSR'd** (`(blog)/+layout.ts`). Loads use `createLoadApi(fetch)`; a failing API is a 503, only a missing article or tag is a 404. Lists seed `SlideFetcher` with the first page (`seo-and-ssr`).
- **Sitemap**: `BlogService.onModuleInit` registers the `blog` (published articles) and `blogtags` (tags with at least one published article) sections. A topic row on a page is built from the posts on screen (`collectBlogTags`), since `listTags` returns every tag ever created.
- `.blog-content` in `blog.css` styles both the public article and the admin editor, so the editor stays WYSIWYG; the admin layout imports it.
- Links in an article that point at `munchwerk.com` become in-app links (`localizeBlogLinks`); everything else opens in a new tab.
- Copy is English. Search `q` is a case-insensitive substring match on title and body text.
