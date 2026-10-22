# State of the data (Berlin dev database, 21 October 2026)

Counted directly from the development database. Nothing is released; this is what the pipeline has gathered while being built. It will move.

## The city

| | |
|---|---|
| City | Berlin (DE-BE), cron on, Instagram on, OSM boundary set, 12 districts |
| Sources | 20 TikTok hashtags, 24 TikTok searches, 20 Instagram hashtags, all enabled |
| Last city-wide Google list | 15 October 2026 (the baseline; openings start with the next one) |
| Last OSM sync | 21 October 2026 |
| Step budgets | defaults (none overridden) |

## Venues and brands

| | |
|---|---|
| Venues | 4,991 (82 closed); 4,909 open with a phone, 3,561 with a website, 196 of those websites are an Instagram or TikTok profile |
| Brands | 4,716; chains among them: Burgermeister (15 branches), Wen Cheng (4), Nhas City Chicken (3), … |
| Venues ever named in a post | 1,076 |
| Brands named in September posts | 258 |
| Venues without a district | 25 (open) |
| OSM checklist | 13,785 places, 3,049 linked to a venue, the rest never looked up |
| Booking links | 569 venues (Google booking page, TheFork or OpenTable) |
| TripAdvisor pages found | 6 |
| Venues with a Google detail page refreshed | all 4,991 have some details; 0 with popular times |

## Posts and mentions

| Month | TikTok | Instagram | Matched mentions | Unmatched | Other city |
|---|---|---|---|---|---|
| 2026-03 (old import) | 1,203 | – | 495 | 194 | 142 |
| 2026-07 | 113 | – | 138 | 40 | 4 |
| 2026-08 | 117 | – | 115 | 43 | 5 |
| 2026-09 | 576 | 25 | 433 | 109 | 51 |
| 2026-10 (so far) | 1,313 | 626 | 1,111 | 394 | 191 |

Source kinds since September: searches 1,217 posts (45 queries), hashtags most of the rest, Instagram place pages 79. Median views per post since September: ~1,200; mean ~74,000 (a few viral posts carry the mean).

October has 166 posts not yet extracted (the daily Instagram run does not extract).

## Reviews

| Month | Reviews | Venues | Written | Answered by the owner |
|---|---|---|---|---|
| 2026-08 | 5,997 | 118 | | |
| 2026-09 | 5,863 | 122 | 3,506 | 670 (11 % of all, 19 % of written) |
| 2026-10 (so far) | 4,299 | 114 | | |

Only report brands' branches and their competitors have reviews. 16,192 reviews in total.

## Reports and sales

| | |
|---|---|
| Reports | 21 for September 2026 (plus one from March); none sent; all rebuilt on 22 October 2026, 5 of them chains (each branch with its own place pages) |
| September reports with competitors | 17 of 21 |
| … with 3+ posts by others | 14 of 21 |
| … with reply drafts | 17 of 21 |
| … with a previous month | 14 (all 14 with the previous month's reviews) |
| … with the city section / search ranks / comments / correlations | 21 / 16 / 13 / 13 |
| … with the rating benchmark | 21 of 21 |
| … with review theme counts | 18 of 21 (Döner Pro, Choc-Spot and Nhas City Chicken have September reviews whose points carry no theme yet) |
| … with popular times / open tables / a menu | 0 / 0 / 0 (one branch has a Lieferando listing without a menu) |
| Prospects | 21, all "to contact", 0 e-mail addresses, 0 Instagram handles, 9 hooks |
| Brands scored | 4,634; 22 at 60 or more |
| Top scores | Döner Pro 89, Choc-Spot 88, Nhas City Chicken 88, Wen Cheng 85, Mr. Noodle Chen 78, The Dawn 75, Oggi's Gemüsekebab 75, DREI. 75, Borchardt 71, Smoky Bite 70, Burgermeister 70 |
| Competitor lists | 118 rows across 24 brands |
| Portal members | none |

## The other signals

| Signal | Rows | Note |
|---|---|---|
| Rating snapshots | 5,207 over 4,991 venues | one per venue from the city list; monthly ones only for scraped venues |
| Search ranks | 48 (20 venues, one month) | |
| Google Trends | 1,164 month-rows, 97 terms | |
| Reservation samples | 46 (21 venues) | the Thursday cron has run once or twice |
| Busyness samples | 0 with data | popular times never returned |
| Delivery listings | 12 (all Lieferando) | 0 menu items |
| Own-account snapshots | 4 | 535 accounts are linked to brands; 14 of the 21 report brands have one |
| Comments | 1,446 scraped, 123 classified | analysis failed in September |
| Press pages | 33 found, 0 classified | classification failed in September |
| Weather days | 173 | |
| Openings / closures | 0 | baseline only |
| Blog | 3 entries, 2 published | |

## Pipeline runs and spend

- September 2026: the monthly run failed part-way (LLM credits ran out) and was finished step by step by hand; several steps show one failed and one succeeded attempt. Steps still failed: review analysis (×2 after the first), comment analysis, press, delivery (partly), busyness, reservations.
- October 2026 so far: Instagram daily runs (5), two matching runs, one lead scoring run.
- Apify spend in October: **$43.01 over 121 runs** (including test runs and partial September steps).
