# Data completeness: gaps, wrong sequences, and the fixes

This is the audit the user asked for: where coverage is thin, where the order of fetching loses data, and what would close each gap. Numbers are the Berlin dev database on 21 October 2026. Tickets written from this audit are listed at the end; existing tickets are referenced by slug.

## A. Coverage today, signal by signal

| Signal | What exists | What a report needs | Verdict |
|---|---|---|---|
| Venue list | 4,991 venues (82 closed), one quarterly Google list (15 Oct), OSM checklist synced (13,785 places, 3,049 linked, ~10,700 never looked up) | Every place a post can name | **Gap**: the OSM lookup step has never run; at the default $10 a month it takes ~5 months to close. One $45 run closes it now. |
| Districts | 25 open venues without a district | Search ranks and neighbourhood need one | Minor |
| TikTok posts | Sept 576, Oct 1,313 (searches give most; hashtag feeds mostly return other months) | A month's posts by the 2nd | Weekly listening since 2026-10-22 (`continuous-listening`); a month's count is comparable once a whole month was listened to |
| Instagram posts | Sept 25, Oct 626 (daily run started in October) | Same | OK from October on; reels weekly and monthly |
| Mentions | Oct: 1,111 matched, 394 unmatched, 191 other city | Matched mentions drive everything | 166 of 1,939 October posts were not extracted on the audit day; the daily run now extracts and matches after each scrape (fixed 2026-10-21) |
| Reviews | Aug 5,997, Sept 5,863, Oct 4,299 across ~120 venues (report brands + competitors). Sept: 3,506 written, 670 answered | Review analysis for the report brand, its competitors, and the months before | A venue new to the set gets six months back in its first scrape (fixed 2026-10-22, B.1); only ~120 of 1,076 ever-mentioned venues have any review |
| Rating snapshots | One per venue from the city list; monthly ones only for scraped venues | Six months for the sparkline | Starts at the first scrape; cannot be backfilled |
| Competitors | 118 rows across 24 brands; 17 of 21 September reports have some | Every report brand | Fixed 2026-10-21: the monthly run fills brands with none before the review scrape |
| Search ranks | 48 rows, 20 venues, one month | Monthly | OK (history builds up) |
| Google Trends | 1,164 rows, 97 terms | Monthly | OK |
| Open tables | 46 samples, 21 venues; 569 venues have a booking link | Thursday samples over a month | Early (the cron has run once or twice) |
| Busyness | 0 samples with data | Twice weekly | **Dead**: `popular-times-and-order-online-source` |
| Delivery | 12 Lieferando listings, 0 menus | Wolt menus for prices | **Dead for menus**: same research task |
| Own accounts | 535 accounts linked to brands; 14 of 21 report brands have one; 4 snapshots | One snapshot per account per month | The step ran before the matcher rework; next run fixes it |
| Comments | 1,446 scraped, 123 classified | Classified | Analysis failed in September (LLM credits); "Finish the month" reruns it free |
| Press | 33 pages found, 0 classified | Classified | Same |
| TripAdvisor | 6 venues with a page | The visitor side | Expected: most Berlin Imbisse have none |
| Weather | 173 days | Full month | OK |
| Openings and closures | 0 recorded | The quarter's changes | Blind until the second quarterly list (January 2027) |
| Reports | 21 for September, all rebuilt on 22 October 2026: every one has the city section and the rating benchmark, 14 a previous month (with its reviews), 13 correlations, 16 search ranks; none has popular times, open tables or a menu | | Rebuild again once the free steps are rerun |
| Lead scores | 4,634 brands scored, 22 at 60+ | | See B.9 |
| Prospects | 21, all "to contact", 0 e-mail addresses, 0 Instagram handles, 9 hooks | Contact data | See the sales doc and ticket `impressum-contact-scrape` |

## B. Structural gaps (by design, with consequences)

1. **Paid per-venue signals exist only for the ~20 report brands and their competitors.** Everyone else has a Google Maps row and whatever posts named them. Consequence: a brand's first report had no history: no previous month's reviews, no "what followed what" (needs six months), and a "problem" signal the lead score could only guess at. Fixed 2026-10-22 (`review-backfill-for-new-report-brands`): the review scrape starts a venue with no Google review stored from before the month (a brand new to the top 20, its branches, new competitors) six months back, in a second run on at most 40 % of the step's Google budget, so the venues already tracked always get their month first. The step's cap went from $5 to $12 for it. It is paid once per venue (~$0.20 for an average one); when many venues are new at once, the cap stops the run and the venues it didn't reach are backfilled the next month. The rating history cannot be backfilled: a new brand still starts with a one-point rating sparkline, and that section simply grows.

2. **TikTok hashtag feeds ignore dates.** The monthly run pays for ~2,000 hashtag items of which a few hundred are the month's; the rest are discarded. The month's TikTok coverage therefore rests on the 24 search queries (three-month window, by relevance, 30+ per query). Fixed 2026-10-22 (`continuous-listening`): searches with a one-week window and a short page of each hashtag every Sunday, and a smaller month-end pass. A second lever is the query list itself: the Sources tab shows yield per query, and "Suggest sources" proposes more; nobody has pruned or extended Berlin's list since it was seeded.

3. **Instagram on the Free plan is one page per hashtag per run** (5–27 posts). The daily run catches a busy tag's day; reels, where the views are, come only monthly and a few per tag. Fixed 2026-10-22: a weekly reels pass runs with the Sunday TikTok run (cents a week). Instagram **follower counts are never returned**, so Instagram creators never appear in "Worth inviting" and count less in the lead score's buzz. Fix: scrape the profiles of the month's top 30 Instagram creators (~$0.002 each).

4. **Google popular times, "Order online" links and "People also search for" have never come back** from the detail-page actor (0 of 4,991 venues with details). Three features are dead: busyness, Wolt menus and prices, and the "people also search" bonus in competitor suggestions. Twice a week a $1 busyness run pays for empty samples. Fix: the research task `popular-times-and-order-online-source`; until it concludes, the busyness cron should be off for the city (a budget of 0 does that).

5. **A name was looked up on Google Maps once ever** (fixed 2026-10-21: a name still unmatched three months after its lookup is searched again, for pennies). A place that opens after its first mention was searched (common: creators post about a place in its first week, before Google lists it) is now found by the next quarter's retry.

6. **Competitors never filled themselves** (fixed 2026-10-21: the monthly run's free "Fill competitors" step gives report brands with no competitor their five best suggestions right before the review scrape; owner and admin picks are never touched, so comparisons stay stable). Before, the cron fired at 06:00 with nobody awake, and every brand new to the top 20 got a report without "How you compare".

7. **Posts older than the month's first day are discarded, though paid for.** The hashtag feed and the three-month search both return earlier months' posts; dropping them keeps a closed month's numbers fixed, but it also keeps the previous-month comparison thinner than it could be. Reviews already follow the other rule (everything from the start date is kept, each review in its own month). Decision in [12-open-decisions.md](12-open-decisions.md).

8. **The top-20 list feeds itself.** Step 7 searches TikTok and Instagram for the names of the brands already in the top 20, which adds posts about them and hardens the list. Brands ranked 21–40 never get a name search, so a place with a strong Instagram-place presence but weak hashtag presence stays below the line. Option: search names for the top 40 and report on the top 20 (about $2 more a month on the Instagram place scrape; the TikTok search run is one run whatever the query count, so its cost grows with items only).

9. **The lead score can only name a problem in the reviews for venues we have reviews for.** "Nameable problem" is 30 % of the score. For the ~4,500 brands with no stored review it is read from their Google rating against their district's food venues (below the median is a problem we can name), and stays unknown (counted at half) only where the district has fewer than five other venues with 20+ reviews. In practice the 60+ list is drawn from the report brands and their competitors. Option: a cheap review sample (the last 20–30 reviews) for the top 100 brands by buzz each month, to widen the funnel; the cost is roughly a tenth of the monthly review step per 100 venues. A budget decision.

10. **The weekly review watch covers subscribers only.** A prospect in conversation is pitched on reviews that are up to five weeks old. Option: watch "contacted" and "replied" prospects too ($1 a run, ~20 venues).

11. **The report month closes on the 2nd.** Owner replies posted after the 2nd are not seen for that month's reply rate, and a review Google surfaces late is in the next scrape only if it is dated in that month. Minor; the weekly watch re-reads subscribers.

12. **Openings and closures start with the second city list.** The first list is the baseline; nothing is "new" until January 2027. Posts fill part of the gap: the LLM extraction flags a mention when the post says the place is new ("just opened", "new in Neukölln"), and such a place, under 300 Google reviews, counts as opened for the lead score's new-place bonus, the "New venues" filter, the Trends page's openings (source "posts") and the report's "Openings and closures nearby" (marked "from a post"); places nobody posts about stay invisible until the second list. Mentions extracted before 22 October 2026 had no flag; an admin action reads stored posts again for the flag alone, keeping their matches and corrections. Berlin's October on dev: 101 of 1,514 posts naming a place flagged, 34 Berlin places among them; a spot check of ten found two wrong (a place telling its six-month story, a seasonal reopening), so a post-flagged opening is a lead to check, not a fact. Earlier months are not read again yet. Option: run the city list monthly instead of quarterly ($20 a month) for the first year.

13. **Across-month comparability.** Counts depend on budgets and on when a scrape ran. The product already works in shares for trends and in medians for the city baseline; sales material should never quote absolute month-to-month counts as growth without this caveat.

## C. Sequence problems

| # | Today | Consequence | Fix |
|---|---|---|---|
| 1 | ~~Daily Instagram run stores posts; extraction and matching run only inside the monthly run or by hand~~ | Fixed 2026-10-21: the daily cron queues extraction and matching after the scrape | — |
| 2 | ~~Competitor fill is manual and must precede the review scrape~~ | Fixed 2026-10-21: a free step of the run, right before the review scrape | — |
| 3 | Busyness samples target the previous report month's brands | A brand new to this month's top 20 has no samples for its first report | Moot while popular times are empty; the per-branch task re-targets anyway |
| 4 | The venue name search (step 7) runs after the first match, on the top 20 only | See B.8 | Budget decision |
| 5 | The OSM lookup runs before the monthly run, at $10 | Right order; too small a budget for the first months | One larger run now |
| 6 | The quarterly city list runs right before the monthly run | Right: new venues are matched the same day | — |
| 7 | Google Trends and search ranks run before the reports | Right | — |
| 8 | Reports are built before lead scores | Right: the pitch hook reads the report | — |
| 9 | A failed free step (LLM credits) stops the run | Right for money (nothing paid after a failure); but the free steps after it don't run until someone presses "Finish the month" | Operational: the Today page lists failed runs |

## D. The fixes, prioritised

| Priority | Ticket (slug) | Effort | Monthly cost | What it fixes |
|---|---|---|---|---|
| done | `auto-fill-competitors-in-monthly-run` | small | $0 | Every report has a comparison; competitor reviews are scraped in the same run (shipped 2026-10-21) |
| done | `extract-and-match-after-recurring-scrapes` | small | $0 (LLM allowance) | In-month freshness for admin and sales; no month-end LLM bulk (shipped 2026-10-21) |
| done | `continuous-listening` | medium | ~$14 (was $15) | TikTok month coverage; comparable months; weekly reels (shipped 2026-10-22) |
| p1 | `popular-times-and-order-online-source` (exists, research) | research | test runs | Busyness, menus, prices, better competitor suggestions |
| done | `review-backfill-for-new-report-brands` | small | up to ~$4 (cap raised $5 → $12) | First reports get a previous month and the patterns section (shipped 2026-10-22) |
| done | `retry-stale-name-lookups` | small | cents | Places that opened after their first mention get matched (shipped 2026-10-21) |
| done | `opening-flag-in-extraction` | small | $0 | Openings known from posts, a year before the city list can tell (shipped 2026-10-22) |
| done | `rating-benchmark-in-report` | small | $0 | A district / cuisine rating benchmark on the cover (each place's header for a chain), in the highlights prompt and in the lead score's problem signal (shipped 2026-10-22) |
| parked | `impressum-contact-scrape` | small | $0 | E-mail addresses for the sales list; parked, since selling happens by visiting (`visit-first-outreach`, p1) |
| op | One-off OSM lookup run at ~$45 | none | one-off | Closes the venue-list gap now instead of in five months |
| op | Rerun September's free steps, then rebuild its reports | none | $0 | September becomes the first complete month |
| op | Set the busyness budget to 0 until the research concludes | none | saves ~$9 | Stops paying for empty samples |
