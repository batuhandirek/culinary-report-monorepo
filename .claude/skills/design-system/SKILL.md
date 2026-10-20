---
name: design-system
description: The design system "Pickle & Plum" — tokens, button variants, character utilities, type, page blocks under `#ui/wrapped`, dialogs/drawers, forms and controls, copy voice. Use when building or restyling any user-facing UI in `apps/frontend` (anything under `src/ui`, `src/components`, `src/dialogs`, route components), or when a change should be checked in `/admin/ui-kit`.
---

# Design system: "Pickle & Plum"

Ferment lab on oat paper: plum ink, one acid-green accent, pixel labels. The living catalogue is `/admin/ui-kit`: check a shared change there first, give a new shared control or block a specimen. Touch targets: memory `feedback_tap_target_size` (~44px, no tiny badges or icon buttons).

## Look

Oat ground (`sand`) with grain over a faint plum dot grid, warm-white cards on warm hairlines, photos in a darker well. Acid pickle green only for the one primary action, the wordmark and fills on ink; pixel labels, tilted stickers and hard offsets carry the character. Tokens in `app.css`: `sand` (page), `paper` (cards/bars), `line`, `wash` (image wells, empty tracks), `tint` (pickle-brine paper: notes, unread, selected), `ink` (plum-black), `faint`, `primary` (= `acid`, ink text on it), `primary-darker` (olive), accents `acid` (on ink), `chili` (active-tab rule, required marks), `beet` (pixel labels and links on paper).

- **Surfaces on sand need a ground**: a hairline panel is `bg-paper border-line rounded-md border`; without `bg-paper` it reads as see-through. Radius `rounded-md` (10px) for cards and panels.
- **Acid is a fill, never ink on paper** (1.1:1 there): on paper it carries an ink frame (the stamp, the section-rule block) or ink text inside it. Green text, bars and other thin marks on paper are `primary-darker`; the focus ring is too. Chili is a rule or glyph, never a sentence (3.9:1).
- **Prices** (none yet): Onest bold `text-ink`; pixel faces have no ₺.
- `dark:` is scoped to an explicit `.dark` ancestor that nothing sets. Don't add `dark:` utilities.
- Toast styling is unlayered CSS at the bottom of `app.css` (classes via `toastOptions.classes` lose to sonner's own rules).

## Type

Onest (variable, `static/fonts/onest`, latin + latin-ext; `₺` lives in latin-ext) for every sentence, title and price. `app.html` preloads both Onest files and the pixel face; a face added to `app.css` that renders above the fold gets a preload there too. Press Start 2P (`font-pixel`, via `eyebrow` / `sticker`) and VT323 (`font-term`) are accents for short labels only, never prose, never prices. `--font-martian` aliases Onest. Standard Tailwind sizes; headings `font-semibold` / `font-bold`, never `font-black` / `extrabold`. Decorative glyphs are Lucide icons or inline SVG (tofu on Android otherwise).

## Buttons and character utilities

- **Button variants**: `default` = the acid *stamp* (2px ink frame + `shadow-stamp`, sinks on press), the one primary action per view and the only ink-framed thing besides the tab bar's sell key and the hero's stamped word; `secondary` ink pill; `outline` ink-bordered pill (icon sizes become round warm-white hairline keys); `ghost` / `link`. Shape lives on the variant, not the size. Sizes are touch-sized; don't shrink below `default`.
- `eyebrow` = 8px Press Start 2P caps label (2–4 words; colour at the call site: `text-muted-foreground`, `text-beet` for spec labels and links). `section-rule` = a section head (acid pixel block, `type-title` h2, trailing `eyebrow text-beet` link, dashed rule), written as `#ui/wrapped/Section.svelte`. `ink-strip` = one-line note on `tint`. `sticker` = tilted ink corner tag. `shadow-sticker` = hard hairline-coloured offset on cards. `font-term` = VT323 for one-line notes/counters. `chip` = pill (ink when active or `aria-pressed`). `checker` = the body's grain and dot grid for full-screen overlays. `pop*` = 1px hairline, `pop-press` / `pop-lift` = opacity dip / hover shadow.
- The wordmark is ink on acid; on acid or any light accent ground use `<Logo ink />` (sand on ink); never a box behind the logo.

## Page blocks (`#ui/wrapped`)

`PageHeader` (desktop head is `PageHeader desktopOnly`), `Panel` (with `rows` + `ListRow` / `SwitchRow`), `Section`, `KeyValueList`, `Notice`, `EmptyState` / `ErrorState`, `SkeletonRows` / `SkeletonCard` / `SkeletonText`, `StickyActionBar` (the phone's primary action), `RadioRows` (a single choice among a few options that each deserve a sentence; an option may carry an `icon`, drawn in a fixed square, and `iconSize` to show relative size, as the parcel boxes in `PARCEL_SIZES` do). Don't re-roll `bg-paper border-line rounded-md border p-5`, an empty state or a loading placeholder.

- **Every data view has four states**: first load is the fetcher's `loadingSnippet` / `skeleton` shaped like the content, never a spinner beside it; empty is one `EmptyState` with one action; a failed load is `ErrorState` with `onRetry`, in place; a load by id shows not-found only when `isNotFoundError` says so.
- **A `grid` needs an explicit column template** (`grid-cols-1`, `minmax(0,…)`); an implicit one overflows the phone viewport. Side-by-side gaps go on `lg:`.
- Page tabs are `UnderlineTabs` (hairline row, chili underline; counts in `eyebrow text-beet`); filter/segment rows are the `Tabs` primitive. Where tabs share a body, mount **one** `Tabs.Content value={liveValue}`. A page's tab is `?sekme=`, a filter inside it `?durum=`, Turkish slugs, default out of the URL. In-page state that must not scroll the shell: `goto(url, { replace: true, shallow: true })`, read back as `page.shallow?.url ?? page.url`.
- Shared rows: `ProseSheet` (long-form pages, e.g. legal texts).
- Images: `imageKitUrl(url, 'w-…')` (`ui/lib/image-kit.ts`); stored URLs already carry `?updatedAt=…`, so a hand-written `?tr=` is swallowed. A photo in a fluid box passes `widths` + `sizes` to `ui/components/Image.svelte`.

## Controls and forms

- Every field's height is `--field-height` (44px, 40px from `md`), overridden with one `h-*`. Something in a form that opens a list is a `FieldTrigger` (`Buttonish` only as a face inside a trigger). Selected is ink. `IconButton` takes a `label` (the accessible name). Overflowing scrollers use `scrollEdges` (`ui/lib/scroll-edges.ts`) with `scroll-fade-x|y`; a sticky rail sits at `top-(--sticky-top)`.
- Forms reference `components/auth/LoginForm.svelte`. Field options carry `required` / `optional` / `counter` and input attributes. `<Form>` owns keyboard submit, so **a submit button outside `<Form>` (dialog footers, wizards) passes `onSubmit` to `<Form>`**, or Enter is a no-op.
- Fallback words ("Vazgeç", "Kapat", "Tekrar dene") come from `ui/lib/ui-labels.ts`; a layout in another language calls `setUiLabels` once (admin does). `/admin/ui-kit/**` stays Turkish.
- Dates `formatDate` / `formatRelativeDate` (`ui/lib/date.ts`), phones `lib/phone.ts`, money `formatMoney` / `formatPrice` (no kuruş or both digits).

## Dialogs

- User-facing dialogs build on `#ui/wrapped/ResponsiveModal.svelte` (vaul drawer below `lg`, centered dialog above), not `Dialog.*`. The drawer subtracts `--keyboard-inset`; dialogs with inputs keep actions in the scrolling body (see `native-and-ota`).
- Opening a dialog from a `DropdownMenu.Item`: render it outside the menu and drive it from state, or the menu unmounts it. Such a dialog seeds its fields from an `$effect` on `open`, not `onOpenChange`: bits-ui reports only the user's own opening and closing, so a dialog opened by setting `open` never hears about it (`panel/components/seller/ChangePriceDialog.svelte`). bits-ui parks `pointer-events: none` on `<body>` ~1s after a modal closes. Popovers default `preventScroll: true`.
- Multi-dialog flows: each dialog standalone, hand-over in a thin composer under `src/components`.
- A mutation that can be undone exactly offers the undo on its success toast (`successNotification.action`) instead of asking first (`ui/lib/action.svelte.ts`).

## Copy

Informal second person ("sen"), sentence case, no "Lütfen". Legal texts stay formal and come from the backend as-is.
