---
name: admin-ui
description: The admin panel under `/admin` — list and detail page conventions, menus, tables, badges, the Money page, the ui-kit component gallery. Use before touching `routes/(admin)`, `components/admin/**`, `constants/ADMIN_MENUS.ts`, `ADMIN_MONEY_TABS.ts`, `admin.*.controller.ts`, or when adding a `/admin/ui-kit` specimen.
---

# Admin UI

English, dense, desktop-first. Backend admin routes are `admin.*.controller.ts` in each module, behind `RolesGuard`.

## Map

`constants/ADMIN_MENUS.ts` is the single source for the sidebar, breadcrumbs, titles, the ⌘K palette and each list page's description. `components/admin/`: `AdminListPage.svelte`, `AdminDetailTabs.svelte`, `AdminPanel.svelte` / `AdminFacts.svelte` (thin presets over `Panel` / `KeyValueList`), `admin-load.ts` (`loadRecord`), `admin-format.ts` (English dates, state badge colours), `construct-admin-breadcrumbs.ts`, `AdminRawJson`, `AdminSimilars`, `CategoryPickerField`, `orders/order-timeline.ts`, `categories/`. The blog editor is `routes/(admin)/admin/blog` (`domain-blog`). Dialogs under `dialogs/admin/`. Tables: `ui/components/paginated-data-table` (`PaginatedDataTable`).

## Rules

- **The admin is organised around the product's pillars, the brand first.** Sidebar: Today · *Market*: Brands, Social, Trends, Cities · *Output*: Reports · *Operations*: Data · *Content*: Blog · *People*: Users, Sessions · *System*: UI kit. A venue is a brand's branch and a prospect is a brand on the sales list, so neither has a menu entry or a list page of its own: `ADMIN_MENUS` entries take `also` paths (`/admin/venues` lives under Brands, `/admin/creators` under Social) for the active entry and the breadcrumbs (a branch reads Brands › brand › branch). A page belongs under its section's path (a topic is `/admin/trends/[key]`); a section with several lists of one pillar is one page with tabs, not a menu entry per list (Social at `/admin/posts`: Posts, Creators, Own accounts, To review); no redirects are kept for old URLs while nothing is released.
- **`/admin` is Today** (`GET /admin/overview` and `GET /admin/overview/today`, `domain-venues-and-reports`): first "Waiting on you", every count with the page where it is done (urgent, then our work, then worth a look); a number band (reports of the report month, the sales stages, Apify spend); follow-ups due, next prospects, the posts we couldn't place, the pipeline's last run. Something that needs an admin's hand gets a line there, not a new page. User counts stay on `/admin/users`, linked at the bottom.
- **A page that shows a month or a city keeps them in the URL** (`?month=`, `?cityId=`; the default — the report month, the first active city — stays out of it) and passes them to every tab (`AdminDetailTabs keeps`), so a link from Today, a refresh and a shared link agree.
- **Counts are a month's, never all-time**, and a change says on which month ("+3 on August"); a blank month is "—", and a page says when a blank means "not scraped" rather than "none".

- A list page is `AdminListPage` around a table view. Columns use the `date` / `badge` / `count` types and `rowHref`, rather than a `dayjs().format()`, a `Badge` component column or an "info" action. Pass the generated client method as `api` and any component as a column (both typed `never`-param on purpose: generated clients have an enum twin per endpoint). **Never an `html` column over user text** (titles, names): use a `link` column.
- A detail page loads through `loadRecord` (an unknown id is an admin 404 inside the frame), keeps its tab in the URL with `AdminDetailTabs` (one body for the live tab), and is built from `AdminPanel` / `AdminFacts`. A state's badge colour comes from `admin-format.ts` so list and detail agree.
- The admin layout calls `setUiLabels` for English fallback words; everything under `/admin/ui-kit/**` stays Turkish because it shows storefront components.
- **`/admin/ui-kit` is the component gallery only** (`design-system`): shared controls and blocks, one specimen per state, from inline sample data. There are no fixture pages for whole screens any more; a screen that needs data dev rarely has is reviewed in the running app with seeded data.
- Browser review tricks (mobile iframe frame, logged-out origin): memory `reference_browser_review_tricks`.
