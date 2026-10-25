---
name: brand
description: The brand "Munchwerk" — what it stands for, its name rules, voice, naming of series and products, title and caption patterns, what public content may never say, and its visual tokens (colours, type, shapes, canvas sizes). Use before writing anything the public, a creator or a venue reads: Instagram posts and captions, share cards, public page titles and meta descriptions, report titles and highlights wording, blog headlines, email subjects and copy, outreach templates.
---

# Brand: Munchwerk

**Munchwerk** watches what a city posts about food (TikTok, Instagram, reviews, food blogs) and turns it into charts, trends and stories. Diners follow it for the lists, creators share it because they're credited, venues pay to see their own numbers. It is a city food-culture brand first; the monthly venue report is one product under it, never the brand's description of itself.

## The name

- **Munchwerk**: one word, capital M only. Never "MunchWerk", "Munch Werk", "Munch-werk" or "the Munchwerk". All caps only inside a logo or a pixel label.
- *munch* (English: eat with gusto) + *Werk* (German: works, workshop). Said "munch-work" in English, "munch-verk" in German; both are right.
- Domain `munchwerk.com`. Handles `@munchwerk`, city editions `@munchwerk.<city>` (`@munchwerk.berlin`).

## Architecture

| Thing | Name |
|---|---|
| The brand | Munchwerk |
| A city edition | Munchwerk Berlin (page `/<city>/…`, handle `@munchwerk.berlin`) |
| What venues buy | Munchwerk for Venues |
| The monthly venue report | "your Munchwerk report" (lowercase "report": it is a thing, not a product name) |
| Monthly top 10 (`/<city>/<month>`) | Heat Check |
| The front page's live list (`/`, the last 30 days, every five days) | Heat Check (live) |
| Fastest climbers | Rising |
| Openings | New in Town |
| Dish whose share jumped most | Dish of the Month |
| Top creator by views | Creator of the Month |
| Quarterly trends (`/<city>/trends/<YYYY>-q<N>`) | Munchwerk Trends, e.g. "Munchwerk Trends: Berlin, Q3 2026" |

A new recurring series gets a short name of one or two words and is added here.

Taglines: **"What the city's munching."** (public) · **"Word of mouth, measured."** (venues).

## Voice

The friend who always knows where everyone's eating, and can prove it.

- **Playful, never snarky.** Puns and a wink are welcome in hooks and series names; facts stay plain. One joke per piece is plenty.
- **Facts first, numbers concrete.** "Posted 48 times by 19 creators" beats "hugely popular". Say what was counted: posts, views, creators, mentions.
- **Talk about the city, not about us.** "Berlin couldn't stop posting about…", not "Our data shows…".
- **Short.** Sentence case for every title and heading. Second person for venues ("your guests", "your branch").
- **English** for public content. A venue's report and outreach follow the prospect's language (`domain-outreach`; the report itself stays English until the `report-language` decision).
- **Write "creator", never "influencer"**; "place" or the venue's name, rarely "establishment" or "venue" in public copy.
- **Avoid**: "insights", "analytics", "data-driven", "solutions", "leverage", "hidden gem", "foodie", "must-try", "viral sensation", "game-changer", exclamation marks in a row, more than two emoji in a caption.

## Patterns

- **Page titles**: the fact, then the city and period: "Berlin's most talked-about places, October 2026". The site template appends " | Munchwerk".
- **Meta descriptions**: one sentence of what's inside, with a number: "The 10 places Berlin posted about most in October 2026, from 3,400 TikTok and Instagram posts."
- **Share cards**: series name as the label, one headline, the city and month; no more than ~8 words of headline.
- **Instagram caption**: a hook line (the surprise or the #1), the list or the fact, credit every creator by `@handle`, a call to the page (link in bio), 3–5 hashtags (the city and food ones, never a creator's). Carousel order: cover, the items, the method in one line ("Counted from 3,400 posts by 900 creators, 1–31 October"), the follow card.
- **Report title and cover**: the headline is the month's story in plain words ("Your brunch got noticed"), not "Monthly report for X". Findings are facts with numbers; actions start with a verb.
- **Blog headlines**: the finding as a sentence, number first when there is one: "Only 11% of Berlin's September reviews got an answer".
- **Email subject**: what's new, under ~50 characters: "Your October Munchwerk report is ready".
- Numbers: "1,200", "40%", "+12 places". Months spelled out: "October 2026". A figure we didn't measure is left out, never written as 0.

## Public guardrails

These hold for every automated post too. Full reasoning: `human-docs/13-public-reports-and-marketing-content.md`.

- **Never republish review texts or Google ratings** in public. Public content uses our own counts.
- **Never a negative list about named venues** ("falling", "worst", "most complained about"). Negatives stay in the venue's private report; public data stories about complaints name no venue.
- **Credit creators by handle and link the original**; embed with the platform's official embed, never re-host video. A removal request is honoured the same day, and the city's do-not-list (`City.doNotListVenues` / `doNotListCreators`) is always respected.
- **Never OSM-derived data** in public (licence).
- **A piece naming venues or creators goes out only after an admin approved it**: a wrong match in public embarrasses a namesake. Automation drafts and schedules; it doesn't skip that step. **The one exception is the front page's live edition** (the user's call, 2026-10-25, open as `front-page-auto-publish`): it publishes itself every five days, so it is held to more instead: positive post summaries and praise only reach the model, every number in a line must be one the model was given, banned words, negatives and star ratings send a line back to its plain fallback, paid and own posts never count, and an admin can take an edition down at once (Public reports › Front page).

## Look

The full token set (CSS, usage notes per token, contrast table, `tokens.json`) is `design-tokens.txt` next to this file, from the Claude Design handoff. Read it before building a share card, a canvas, an email or a page. The rules that shape every composition:

- **Day and night.** Day: oat ground, plum-black ink. Night: ink ground, oat text, lavender for purple text, acid shadows. Green is daytime and fresh, grape is evening and nightlife; pick the theme by the content (New in Town and stories lean night).
- **Two brand colours.** Acid `#c6f135` and grape `#6a2bea` are fields (big flat blocks), not text on light grounds. On acid, text is always ink. On grape, text is oat or acid, never ink (2.6:1). Green as text is `#4d7612` by day; purple as text is grape by day, lavender `#c9b3ff` by night only.
- **Accents stay small.** Beet `#8c2d5c` for Dish of the Month; chili `#e2452b` only as a mark or 24px+ (rising arrows, "hot" stamps). Neither sits next to grape.
- **Type.** Bricolage Grotesque 800 for headlines, place names and big numbers (rank numerals are graphic elements); Onest for every sentence; Press Start 2P for caps stamps of one or two words ("HEAT CHECK · OCT 2026"), never sentences. Sizes are the `display-*`, `body*`, `stamp*` styles; on a 1080 canvas body text is 32px+.
- **Shapes.** Square by default (fields, bars, photo frames); stickers and pills are rounded. Shadows are hard offsets, never blurred: ink by day, acid by night. Bold ink rules instead of grey dividers.
- **Character, rationed.** At most two tilted elements per composition, never at the same angle. One bite (a mouthful cut from a shape's top-right corner, its edge round tooth marks scalloped like a drawn cloud) per composition.
- **Charts.** Ink bars (lavender by night), the one bar the story is about in acid with an ink outline, up in green, new in purple, flat in muted. **A decline is never red** in public; venue reports show fewer posts as flat.
- **Instagram canvases.** 1080 wide, 72px side gutter that only a bleeding field crosses; stories 1080×1920 with 250px top and bottom kept clear of text and logo. Hand-made posts are designed in the admin's Instagram studio (`admin-ui`), whose `designs/parts` already carry these rules.
- **Logo:** the drawn all-caps wordmark with the bitten K (the same tooth-marked bite), one line or stacked (MUNCH / WERK). In the app `components/Logo.svelte` (`variant`, `tone` ink | oat | acid; paths in `constants/BRAND_LOGO.ts`); files in `apps/frontend/static/brand/` (SVGs per colour, `og-default.png`, `email-logo.png`, `social/avatar-*.png`); favicons in `static/favicon/` (the wordmark's M, acid on ink). `node bin/build-brand-assets.mjs` re-renders every PNG and the .ico from the SVGs.

In the app these are classes and tokens in `app.css` (`design-system` skill: `bg-grape`, `type-hero`, `stamp`, `shadow-hard`, `bite`, …); share cards and emails carry them as literal colours.
