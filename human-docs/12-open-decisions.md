# Open decisions

Things only the business can decide. For each, what the code does today (the assumption it runs on) and what changes with the other choice. Decisions already queued as tickets are marked.

| # | Decision | Today / assumption | The alternative and what it changes |
|---|---|---|---|
| 1 | **Report language** (ticket `report-language`) | English reports; outreach templates in English and German | German (or per prospect): the highlights, labels, drafts and review excerpts follow the prospect's language. The pitch to a Berlin Imbiss owner is in German either way; an English report is friction at the moment of the sale. |
| 2 | **Pricing and tiers** | Nothing in the code; "won" is binary | A cheaper weekly-pulse tier, a chain tier, one-off deliverables (creator brief, competitor deep-dive): see the ideas doc. Tiers would need a plan on the prospect and steps that read it. |
| 3 | **Keep posts from earlier months that a scrape returns** | Dropped (a closed month's numbers never move) | Keep them (as reviews already do): fuller previous-month comparisons and six-month series; a closed month's counts can grow after its report was built. Small code change. |
| 4 | **Search names for the top 40, report on the top 20** | Top 20 only | ~$2 more a month; brands just below the line get their Instagram-place and TikTok-search posts, so the top list is less self-reinforcing. |
| 5 | **A review sample for the top 100 brands by buzz** | Reviews only for report brands and competitors | ~$5–10 a month (to measure); the lead score's "nameable problem" becomes known for the whole funnel instead of ~120 venues. The sales list changes materially. |
| 6 | **City-wide Google list monthly for the first year** | Quarterly ($20) | $20 a month; openings and closures become visible from month two instead of 2027, also for places nobody posts about (posts saying a place just opened already count). |
| 7 | **Spend ~$45 once on the OSM lookup** | $10 a month, ~5 months to catch up | One run now; the venue list is complete for matching before the next report month. |
| 8 | **Turn the busyness sampling off** until a source works | $1 twice a week for empty samples | Budget 0 on the city; nothing is lost. |
| 9 | **Watch reviews for prospects in conversation** | Subscribers only | ~$1 a week; follow-ups quote this week's review. |
| 10 | **Which public content first** ([13](13-public-reports-and-marketing-content.md)) | None published yet; the monthly top-hits page and the quarterly food trends page are built and wait for an admin to publish | The top-hits page and its Instagram cards exist (Trends › Public highlights), the food trends page too (Trends › Food trends report, after its search pull); the gated benchmark earns e-mail consent. |
| 11 | **A newsletter** | Transactional mail only | Needs double opt-in, an unsubscribe flow and a sender setup; worth it only with the openings and trends content behind it. |
| 12 | **Second city** | Berlin | The city form is enough; the cost is the constraint on the Free plan ($250 usage limit): two cities need trimmed budgets or fewer paid signals. |
| 13 | ~~Per-branch place data~~ | Done 2026-10-22: every branch of a report brand gets its own place sections (popular times, tables, prices, search ranks, the neighbourhood); the per-branch steps cost about a third more on dev's chains (search ranks' default went from $3 to $4). | — |
| 14 | **Public venue pages (SEO)** | None | Reach and leads at scale, with brand risk (venues objecting) and a legal check on what of Google's can be shown. A later bet. |
| 15 | ~~Auto-fill competitors in the run~~ | Done 2026-10-21: automatic for brands with none, right before the review scrape; owner and admin picks are never overwritten. | — |
