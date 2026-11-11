# Operations: what runs, when, and what calls what

The pipeline (`apps/backend/src/modules/pipeline/`) is a set of **operations**. Each operation is a folder with its own DBOS workflow (one per cadence), its own schedule and its own queue. Every run shows on `/admin/workflows`. Nothing runs the operations in order, and there is no monthly run. An operation that needs another's work **calls it**.

Times are UTC. Every schedule fires for each **cron city** (`CityService.forMonthlyCron`: active, cron on). With `INGESTION_IS_DISABLED=true` (dev) no schedule exists; a run starts only when an admin triggers a schedule on `/admin/workflows`.

---

## 1. The rules every operation follows

| | |
|---|---|
| **Run id (the idempotency key)** | A city's run of an operation for one period has one fixed id: `<operation>.<cadence>-<cityId>-<period>`. Period is `YYYY-MM` (month: the month that just ended), `YYYY-Www` (ISO week of the run day) or `YYYY-MM-DD` (day). Built by `operationRunId` in `shared/util/operations.ts`. |
| **What the fixed id buys** | The operation's own schedule and every operation depending on it start the **same** run. The first to ask starts it. Later askers get its handle and await it. Once it has finished, they get its stored result at once and nothing is paid again. |
| **A failed run** | Stays `ERROR` under its id, and nothing starts it again by itself (a dependent awaiting it fails too). An admin **resumes** it on `/admin/workflows`: it goes on from the last finished step. |
| **Calling a dependency** | `runOperation(durable, workflow.method, RUN, cityId, period)` is called from the workflow's body, never from inside a step. It starts the run on the dependency's queue under its id and awaits the result. |
| **Queues** | One per operation, `workerConcurrency: 1` unless noted (one city at a time per operation). A run awaiting its dependency holds only its own queue's slot, never the dependency's, so nothing deadlocks (the dependencies form no cycle). |
| **A step** | One `@DurableStep({ name: <PipelineStepEnum value> })` that loads the city by id and makes **one call to a domain service**. The pipeline holds no entity and no SQL. A step's result is stored. After a crash the step runs again, and its Apify runs **re-attach** by the workflow's id and the step's id, so nothing is paid twice. |
| **Budget** | Each paid step spends `City.stepBudgetsUsd[STEP]`, else `DEFAULT_STEP_BUDGET_USD[STEP]` (`constants/pipeline.constant.ts`). Apify enforces it as the run's cap. |
| **Apify runs** | Every Google Maps places call is the `places` atom (`pipeline/atoms/places/`, workflow `places.run`) and every Google review fetch the `reviews` atom (`pipeline/atoms/reviews/`, `reviews.run`): a child of the operation on the `apify` queue (the credit wait, 4 at most), the operation as the run's owner (`ApifyRun.ownerWorkflowId`, what the Data page's spend per month sums by), one save path each (`VenueScrapeService.savePlaces`, `ReviewService.saveReviews`). The operation keeps a plan step, the atom's call from its body (`call`, or `callAll` for a plan's several runs), and a save step named after the `PipelineStepEnum` value where the Data page reads one. Every Instagram profile run is the `instagram-profiles` atom (`instagram-profiles.run`, saved by `AccountScrapeService.saveInstagramProfiles`) and every TikTok profile run the `tiktok-profiles` atom (`tiktok-profiles.run`, `saveTiktokProfiles`; an operation that runs both calls them one after the other, never side by side), every TikTok search the `tiktok-search` atom (`tiktok-search.run`, `SocialScrapeService.saveTikTokSearch`) and every Instagram hashtag run the `instagram-hashtags` atom (`instagram-hashtags.run`, `SocialScrapeService.saveInstagramHashtags`); a plan's runs of one atom whose saves must not overlap go one after the other (`callEach`). An actor with one caller is no atom but runs the same way: its operation's body starts it as a child (`runActorCallRef` for one run, `startActorCall` then `settleHandles` for several) between a plan step and a save step reading the stored items. **No actor runs inside a step.** |
| **LLM calls** | Every agent call in the reading and in `read-mentioned-profiles` is a `DurableLlmService` child workflow on the `llm` queue (8 at a time). It **waits until an account can serve** (next 00:00 UTC for a daily limit) and never fails for want of a model. The ledger (`llm_calls`) files each call under the city, the operation (`purpose`) and the workflow id. Exception: matching's `VenueMatchAgent` calls run inline inside the `match mentions` step. |
| **Shutdown** | After SIGTERM no new actor run starts. An inline run inside a step waits rather than fail the run, and the next process resumes it. |

---

## 2. When things start

### Hourly (the reading)
| UTC | Schedule | Starts, per cron city |
|---|---|---|
| :10 | `read-posts` | `read-posts.city` (queue `read-posts-city`, **dedupe = cityId**) |
| :20 | `read-reviews` | `read-reviews.city` (queue `read-reviews-city`, dedupe = cityId) |
| :30 | `read-comments` | `read-comments.city` (queue `read-comments-city`, dedupe = cityId) |
| :40 | `match-mentions` | `match-mentions.city` (queue `match-mentions`, dedupe = cityId) |
| :50 | `classify-press` | `classify-press.city` (queue `classify-press-city`, dedupe = cityId) |
| :00 | `demand-sample` | `sample-busyness.day` / `sample-reservations.day` only for a city whose local clock reads 19:00 on a sampling day |

"dedupe = cityId" means one run in flight per city: a second ask while it runs gets that run (`onDuplicate: 'return-existing'`). Unlike the fixed ids, a finished city run doesn't block the next hour's.

### Daily
| UTC | Schedule | Workflow (run id period = the UTC day, or the city's local day where noted) |
|---|---|---|
| 04:00 | `scrape-instagram.day` | `scrape-instagram.day` |
| 04:20 | `creator-watch.day` | `creator-watch.day` |
| 05:15 | `dish-searches.day` | `dish-searches.day`, only cities whose newest snapshot is `City.dishSearchEveryDays` old (period = city's local day) |
| 05:30 | `post-counts.day` | `post-counts.day` |
| 05:45 | `account-followers.day` | `account-followers.day` |
| 22:00 | `reread-posts` | `reread-posts.post` for up to 200 posts read before `POSTS_GATED_AT`, most viewed first |
| 22:00 | `llm-backlog` (backlog module) | the backlog drain, which includes the `reread-reviews` backlog the pipeline registers |

### Weekly
| UTC | Schedule | Workflow (period = ISO week) |
|---|---|---|
| Sun 03:00 | `scrape-tiktok.week`, `scrape-instagram.week`, `scrape-blogs.week`, `scrape-accounts.week`, `scrape-venue-social.week`, `read-mentioned-profiles.week`, `lookup-venues.week`, `find-own-accounts.week` | all fire together; the dependencies (section 4) settle the order |
| Mon 05:00 | `review-watch.week` | `review-watch.week` |
| Tue 04:30 | `rating-snapshot.week` | `rating-snapshot.week` |
| Wed 04:45 | `profile-track.week` | `profile-track.week` |

### Monthly (the 2nd, 06:00, for the month that just ended)
All of these fire at the same minute: `scrape-venues`, `osm-places`, `scrape-tiktok`, `scrape-instagram`, `scrape-blogs`, `lookup-venues`, `scrape-venue-social`, `scrape-accounts`, `fill-competitors`, `scrape-reviews`, `refresh-venue-details`, `scrape-delivery`, `scrape-comments`, `scrape-press`, `search-interest`, `score-leads` (each `.month`). The dependencies settle the order (section 4).

### Only by hand
| Route | Workflow | Run id |
|---|---|---|
| `POST /admin/backfill-reviews` `{ cityId, since?, talkedDays?, budgetUsd? }` | `backfill-reviews.run` | `backfill-reviews.run-<cityId>-<since>` |
| `POST /admin/brands/:id/searches` `{ cityId }` (the brand page's "Find branches") | `brand-branch-search.brand` → `places.run` | no fixed id; one in flight per brand and city (dedupe `<brandId>:<cityId>`); the page polls `branchesSearchedAt` |
| `POST /admin/mentions/reflag-openings` | `reflag-openings.page` → `reflag-openings.post` per post | no fixed id |
| `POST /admin/food-trends/pull-searches` `{ cityId, quarter }` | `FoodTrendsPullWorkflow.pull` (queue `food-trends-pull`): one Trends compare run per group of five kinds of food, children on the `apify` queue | no fixed id; one in flight per quarter (dedupe `<cityId>:<quarter>`, and the report's `searchPull` state) |
| Brand page "Build report" | `ReportService.build` (no workflow; **no schedule builds reports**) | — |
| `/admin/workflows` → Schedules → trigger | any schedule above, for every cron city | the schedule's ids |

---

## 3. Every operation

`→ calls` lists the dependencies awaited before the steps (in that order). Steps are listed in order with the service call each one makes.

### Reading

**`read-posts`**: one workflow per post.
- `read-posts.city(cityId)`
  - Step `unread posts`: `MentionExtractionService.unreadPostIds` (1,000 at most, most viewed first).
  - Then starts every `read-posts.post` under its fixed id and awaits them in order.
- `read-posts.post(postId)`: run id **`read-posts.post-<postId>`**, queue `read-posts` (8).
  1. `plan`: `MentionExtractionService.postForReading` (none if already read).
  2. **LLM `PostGateAgent`** (mini): is it about eating or drinking out in the city? Skipped in code when the post has nothing to read (`no_content`).
  3. `save gate`: `MentionExtractionService.saveGate`. A skipped post ends here.
  4. **LLM `PostClaimsAgent`** (full, gpt-5.4): agent A, the post's places and its claims.
     - A post over `POST_SPLIT_ABOVE` characters is read in parts: one call for its places, then one per part.
     - The parts are started in order, then awaited in order (`readPostClaims` through `DurableLlmService.as`).
  5. `save reading`: `MentionExtractionService.saveReading` (mentions, statements).
  6. `label claims`: `StatementPartsService.read` (Jev classifier, paid per call, not through `DurableLlmService`).
  7. `link topics`: `MentionExtractionService.linkTopics`.
- Ledger purpose: `read-posts`.

**`match-mentions`**: per city.
- `match-mentions.city(cityId)` → calls `read-posts.city` (as a child, no dedupe) first.
  1. `match mentions`: `MentionMatchingService.match`. **LLM `VenueMatchAgent`** (mini) is called inline here, for close calls: which venue or branch a name is.
  2. `match accounts`: `AccountMatchingService.match`, only if anything matched.
  3. `match by tags`: `MentionMatchingService.matchByTags`, same condition.
- Dependents call it with **`matchCityNow`**: queue `match-mentions`, dedupe = cityId.
- Ledger purpose: `match-mentions`.

**`read-reviews`**: one workflow per written review.
- `read-reviews.city(cityId)`
  - Step `unread reviews`: `ReviewService.unreadReviewIds` (1,000, newest first).
  - Then every `read-reviews.review` under its id.
- `read-reviews.review(reviewId)`: run id **`read-reviews.review-<reviewId>`**, queue `read-reviews` (8).
  1. `plan`: `ReviewService.reviewForReading`.
  2. **LLM `ReviewClaimsAgent`** (mini): agent A, the review's claims.
  3. `save claims`: `ReviewService.saveReviewReading`.
  4. `label claims`: Jev.
- Dependents call `readReviewsOfCity` (dedupe = cityId).
- Ledger purpose: `read-reviews`.

**`read-comments`**: one workflow per post with unread comments.
- `read-comments.city(cityId)`
  - Step `posts to read`: 500 posts at most.
  - Then every `read-comments.post` under **`read-comments.post-<postId>`**, queue `read-comments` (4).
- `read-comments.post(postId)`
  1. `plan`: `PostCommentService.commentsForReading`. Tag-only and emoji-only comments need no model.
  2. **LLM `CommentIntentAgent`** (mini): one call per remaining comment, started in order, then awaited in order.
  3. `save intents`.
  4. If comments disagree: **LLM `CommentDisagreementAgent`** (mini), one sentence for the post, then `save disagreement`.
- Ledger purpose: `read-comments`.

**`classify-press`**: one workflow per press page.
- `classify-press.city(cityId)`
  - Step `unclassified pages`: 1,000 at most.
  - Then every `classify-press.page` under **`classify-press.page-<id>`**, queue `classify-press` (8).
- `classify-press.page`
  1. `plan`: `WebMentionService.pageForClassifying`.
  2. **LLM `PressClassificationAgent`** (mini): feature, listicle, passing mention or unrelated.
  3. `save classification`.
- Dependents call `classifyPressOfCity`.
- Ledger purpose: `classify-press`.

**`reread-posts`** (nightly): posts read before `POSTS_GATED_AT`.
- `reread-posts.post(postId)`: run id **`reread-posts.post-<cutoff day>-<postId>`**, queue `reread-posts` (4).
- Steps, in order: plan → `PostGateAgent` → `save gate` → `clear reading` → `PostClaimsAgent` → `save reread` → `label claims` → `link topics`.
- Unlike `read-posts`, the save pairs agent A's places with the post's stored mentions and keeps admin decisions (`MentionExtractionService.saveReread`).

**`reread-reviews`**: not a workflow of its own.
- It's the `reread-reviews` backlog (priority 40), registered from `pipeline/reread-reviews/`, drained by the 22:00 backlog run inside the day's shared token budget.
- `ReviewClaimsAgent` is called plainly inside the drain's batch step.

**`reflag-openings`** (by hand): `reflag-openings.page` lists candidates, then starts `reflag-openings.post` per post. `PostClaimsAgent` re-reads only the "new opening" flag, and `MentionExtractionService.saveReflag` stores it.

### Monthly scrapes (period `YYYY-MM`, the month that just ended)

| Operation `.month` | → calls first | Steps (service call) | Apify actor(s) | Default cap |
|---|---|---|---|---|
| `scrape-venues` | — | `clock`; `due` (`cityVenueScrapeDue`: a quarter since the last list); if due → **`places.run`** (grid: restaurant/bar/cafe, 1,000 a term, every place saved, openings after the first list) → `SCRAPE_VENUES` (`VenueScrapeService.markCityScraped`) → calls `brand-branch-search.month` | compass/crawler-google-places (the atom) | $20 |
| `brand-branch-search` | called by `scrape-venues.month` | `clock`; `plan` (`BrandService.planBranchSearch`: every chain with a branch in the city) → **`places.run`** (grid: the names, 40 each, every place saved as a lookup) → `SEARCH_BRANCHES` (`BrandService.saveBranchSearch`: `autoMerge`, the brands stamped, candidates counted). `brand-branch-search.brand` is the same for one brand, by hand ($1) | compass/crawler-google-places (the atom) | $2 |
| `osm-places` | `scrape-venues.month` | `boundary` (has `osmRelationId`?); `SYNC_OSM_PLACES` (`OsmPlaceService.sync`, free Overpass); `clock`; `plan osm lookups` (`OsmPlaceService.planLookups`) → **`places.run`** (typed: name and address, one each) → `LOOKUP_OSM_PLACES` (`OsmPlaceService.saveLookups`) | compass/crawler-google-places (the atom) | $10 |
| `scrape-tiktok` | — | `plan month` (`SocialScrapeService.planCityTikTok`: the city's searches and hashtag words, window MONTH, 50 a query) → **`tiktok-search.run`** | novi/advanced-search-tiktok-api (the atom) | $4 |
| `scrape-instagram` | — | `plan month` (`planCityInstagram`: posts on ¾ of the budget, reels on ¼, from the 1st) → **`instagram-hashtags.run`** posts, then reels | apify/instagram-scraper (the atom) | $8 |
| `scrape-blogs` | — | `SCRAPE_BLOGS` (`BlogScrapeService.scrapeCity`) | none (feeds) | free |
| `lookup-venues` | `scrape-venues`, `osm-places`, `scrape-tiktok`, `scrape-instagram`, `scrape-blogs` (all `.month`), then `matchCityNow` | `clock`; `plan lookups` (`MentionMatchingService.unmatchedNames` → `VenueScrapeService.planLookups`) → **`places.run`** (grid: 3 a name) → `LOOKUP_VENUES` (`VenueScrapeService.recordLookups`), then `matchCityNow` again | compass/crawler-google-places (the atom) | $6 |
| `scrape-venue-social` | `lookup-venues.month` | `plan month` (`planVenueSearch` + `planVenuePlaces`: each report brand's busiest branch carries the name search, half the budget each) → **`tiktok-search.run`**, the Instagram location actor as a child → `SCRAPE_VENUE_SOCIAL` (`saveVenuePlaces`; the month's summary) | novi TikTok search (the atom), scraping_solutions Instagram location (a child) | $8 |
| `scrape-accounts` | `lookup-venues.month` | `SCRAPE_ACCOUNTS`: outreach's Instagram handles of the report brands become accounts (`OwnAccountService.addProspectHandles`), then `AccountWatchService.watchList` (month kinds) → `profileRuns` (the latest ten, posts from the 1st), all in the `plan month` step → **`instagram-profiles.run`**, then **`tiktok-profiles.run`** | apify/instagram-profile-scraper, clockworks/tiktok-profile-scraper (the atom) | $4 |
| `fill-competitors` | `scrape-venue-social.month`, `scrape-accounts.month`, `matchCityNow` | `refresh topics` (`MentionTopicService.relink`, `VenueTopicService.refreshCity`); `FILL_COMPETITORS` (`CompetitorService.fill` of the report brands) | none | free |
| `scrape-reviews` | `fill-competitors.month` | `clock`; `plan reviews` (`ReviewService.planReportMonth`: branches + competitors, the tracked venues from the month's first day or their last fetch, a venue new to the set from 6 months back on ≤40 %) → **`reviews.run`** per start day (`callAll`) → `plan tripadvisor pages` → the Google search as a child → `save tripadvisor pages` → `plan tripadvisor reviews` → the reviews actor as a child → `SCRAPE_REVIEWS` (`saveMonth`; the month's summary); TripAdvisor on 10 % of the cap | compass/Google-Maps-Reviews-Scraper (atom); apify/google-search-scraper, scrapeunblocker/tripadvisor-reviews-scraper (children) | $12 |
| `refresh-venue-details` | `fill-competitors.month` | `plan details` (`ReportBrandsService.scope`: branches + competitors by place id) → **`places.run`** (details, known venues only) → `REFRESH_VENUE_DETAILS` (`VenueScrapeService.detailsSummary`) | compass/crawler-google-places (the atom) | $2 |
| `scrape-delivery` | `refresh-venue-details.month` | `clock`; `plan wolt` (`VenueDeliveryService.planWolt`: one run per linked restaurant) → every Wolt run a child, started first, awaited in order → `save wolt` → `plan lieferando` (the venues not on Wolt, on what is left) → the listing as a child → `SCRAPE_DELIVERY` (`saveLieferando`; the summary) | needy_hammock/wolt-restaurant-menu-scraper, studio-amba/takeaway-scraper (children) | $7 |
| `scrape-comments` | `fill-competitors.month` | `plan comments` (`PostCommentService.topPosts` 5 a brand → `SocialScrapeService.planComments`, 100 each) → one child per post in 1 GB, started first, awaited in order → `SCRAPE_COMMENTS` (`saveComments`; a failed run's post stays for next time) | clockworks/tiktok-comments-scraper (children) | $13 |
| `scrape-press` | `fill-competitors.month` | `clock`; `plan press` (`WebMentionService.planMonth`: one query a brand) → the news and the web search as children, both started, then awaited → `SCRAPE_PRESS` (`saveMonth`; one failing keeps the other's mentions, then the run fails) | scrapewise/google-news-scraper, apify/google-search-scraper (children) | $3 |
| `search-interest` | — | `plan` (`SearchInterestService.plan`: topics in Food & Drink, won brands' names in all categories) → the two runs as children, both started, then awaited → `SEARCH_INTEREST` (`save`) | signalbench/google-trends-scraper (children) | $2 |
| `score-leads` | `scrape-reviews.month`, `scrape-press.month`, `matchCityNow`, `readReviewsOfCity`, `classifyPressOfCity` | `SCORE_LEADS` (`BrandLeadScoreService.scoreAll`) | none | free |

"Report brands" everywhere means `ReportBrandsService.of(city, month)`: the city's `topBrands` most talked-about brands of the month (`MentionMatchingService.topBrandIds`) plus every won prospect with a branch there (`ProspectQueryService.wonBrandIds`), each with its open branches (`BrandService.openBranchesIn`). `scope` adds the competing places (`CompetitorService.competitorVenuesOf`).

### Weekly scrapes (period `YYYY-Www`)

| Operation `.week` | → calls first | Steps (service call) | Apify / LLM | Default cap |
|---|---|---|---|---|
| `scrape-tiktok` | — | `clock`; `plan week` (window WEEK, 30 a query, last 8 days) → **`tiktok-search.run`** | novi/advanced-search-tiktok-api (the atom) | $4 |
| `scrape-instagram` | — | `clock`; `plan reels` (reels, last 8 days) → **`instagram-hashtags.run`** | apify/instagram-scraper (the atom) | $1 |
| `scrape-blogs` | — | `SCRAPE_BLOGS` | none | free |
| `scrape-accounts` | — | `clock`; `plan week`: every brand's own accounts (last month's report brands and rivals first, then by lead score), posts of the last 15 days, TikTok planned at 3 a profile → **`instagram-profiles.run`**, then **`tiktok-profiles.run`** | the two profile scrapers (the atom) | $16 |
| `scrape-venue-social` | — | `clock`; `plan week`: last month's report brands, their competitors' brands and the open prospects, by name (`ReportBrandsService.nameSearchVenues`), TikTok only, window WEEK → **`tiktok-search.run`** | novi TikTok search (the atom) | $4 |
| `read-mentioned-profiles` | the five weekly scrapes above, `matchCityNow` | `budget`; `mentioned accounts` (`AccountMatchingService.addMentionedAccounts`); `plan profile reads` → **`instagram-profiles.run`** (the profile alone, the accounts stored); `match accounts`; `plan address searches` → **`places.run`** (typed: name and address, 3 each) → `save address searches` → `match accounts`; `plan place questions` → **LLM `ProfilePlaceAgent`** (mini) per profile (started then awaited in order) → `record @handle`; `match by tags` | instagram-profile-scraper and compass/crawler-google-places through their atoms; LLM purpose `read-mentioned-profiles` | $2 |
| `lookup-venues` (`LookupVenuesWeekWorkflow`) | the five weekly scrapes, `read-mentioned-profiles.week` | `matchCityNow`, `plan lookups` → **`places.run`** → `LOOKUP_VENUES`, `matchCityNow` (the month's pieces) | compass/crawler-google-places (the atom) | $6 |
| `find-own-accounts` | `lookup-venues.week` | `clock`; `plan` (`AccountTwinService.planLookup`: the handle on the other platform) → **`instagram-profiles.run`**, then **`tiktok-profiles.run`**, saving only accounts we know → `link twins` (`saveLookup`: the proofs read from the runs' stored items) | the two profile scrapers (the atom) | $1 |
| `review-watch` (Mon) | — | `clock`; `subscribed venues` (won brands' open branches); `plan reviews` (`ReviewService.planRecent`: 10 days back, or the last fetch) → **`reviews.run`** per start day; then `readReviewsOfCity`; `alerts` (`ReviewService.claimAlerts` → outreach mails the alert, `ReviewReplyAgent` drafts the reply there, outside the pipeline) | compass/Google-Maps-Reviews-Scraper | $1 |
| `rating-snapshot` (Tue) | — | `clock`; `plan` (`RatingSnapshotService.plan`: every open venue, those posts named first, from its last fetch) → **`reviews.run`** per start day → one **`reviews.run`** (`newest`) for the venues that returned nothing | compass/Google-Maps-Reviews-Scraper | $15 |
| `profile-track` (Wed) | — | `clock`; `plan` (`AccountScrapeService.planTracked`) → **`instagram-profiles.run`**, then **`tiktok-profiles.run`** (the profile alone) | the two profile scrapers (the atom) | $10 |

### Daily scrapes (period `YYYY-MM-DD`)

| Operation `.day` | Steps | Apify | Default cap |
|---|---|---|---|
| `scrape-instagram` (04:00) | `clock`; `plan newest` (each hashtag's newest page of posts, last 2 days) → **`instagram-hashtags.run`** | apify/instagram-scraper (the atom) | $2 |
| `creator-watch` (04:20) | `clock`; `plan` (`AccountWatchService.planCreatorScrape` + TikTok's start from this workflow's last successful run, read from DBOS); **`tiktok-profiles.run`** (the videos since that start), then **`instagram-profiles.run`** (the due profiles' posts of the last week) | clockworks/tiktok-profile-scraper, apify/instagram-profile-scraper (the atom) | $3 |
| `dish-searches` (05:15, when due; period = city's local day) | `refresh topics`; `clock`; `plan sweep` (`DishSearchService.planSweep`: every searched topic × district); one **`places.run`** per search (map mode, 2 GB, $0.50 cap), all started in order then awaited in order (`settleHandles`), the `apify` queue holding 4; `TRACK_DISH_SEARCHES` (`DishSearchService.saveSweep`: each run's items read by its record id) | compass/crawler-google-places (the atom) | $25 |
| `post-counts` (05:30) | `clock`; `plan` (`PostCountsService.plan`: posts 7–14 days old, one run a platform) → both runs as children, started, then awaited → `REFRESH_POST_COUNTS` (`save`; one failing keeps the other's reads, then the run fails) | clockworks/tiktok-scraper, apify/instagram-scraper (children) | $2 |
| `account-followers` (05:45) | `clock`; `plan` (`AccountScrapeService.planFollowers`) → **`instagram-profiles.run`**, then **`tiktok-profiles.run`** (the profile alone) → `filled` | the two profile scrapers (the atom) | $1 |
| `sample-busyness` (19:00 local, Thu and Sat) | `clock`; `plan busyness` (last month's report branches + competitors) → **`places.run`** (details) → `SAMPLE_BUSYNESS` (`VenueBusynessService.saveSample`: the sample from the run's items) | compass/crawler-google-places (the atom) | $1 |
| `sample-reservations` (19:00 local, Thu) | `clock`; `plan reservations` (`VenueReservationService.sampleOrder` → `planSample`, 600 venues at most) → TheFork's run and OpenTable's per domain and date started as children → `google reserve` (`sampleGoogle`: the free pages fetched meanwhile) → the children awaited → `SAMPLE_RESERVATIONS` (`saveSamples`; a failed platform fails the run once the rest is saved) | Google's booking page (plain fetch, free), clearpath/thefork-scraper, canadesk/opentable (children) | $1 |

### By hand
| Operation | Steps | Apify | Default cap |
|---|---|---|---|
| `backfill-reviews.run(cityId, { since, talkedDays, budgetUsd })` | `clock`; `plan backfill` (`RatingSnapshotService.due`: venues posts named in `talkedDays` → `ReviewService.venuesWithHistory` → `ReviewService.planBackfill`) → **`reviews.run`** per 100 venues, one after the other, each capped over its plan and never more than the budget left, until the budget is spent (a resumed run re-attaches to the finished children) | compass/Google-Maps-Reviews-Scraper | $90 |

---

## 4. Who calls whom

```
MONTH (2nd, 06:00, all scheduled at once; arrows = "calls and awaits")

score-leads ──► scrape-reviews ──► fill-competitors ──► scrape-venue-social ──► lookup-venues
     │                                   ▲  │                                       │
     ├──► scrape-press ──────────────────┤  └──► scrape-accounts ──► lookup-venues    ├──► scrape-venues ──► brand-branch-search
     ├──► match-mentions ─► read-posts   │                                            ├──► osm-places ──► scrape-venues
     ├──► read-reviews.city              │                                            ├──► scrape-tiktok
     └──► classify-press.city            │                                            ├──► scrape-instagram
                                         │                                            ├──► scrape-blogs
scrape-delivery ──► refresh-venue-details┤                                            └──► match-mentions ─► read-posts
scrape-comments ─────────────────────────┘
search-interest   (no dependency)

WEEK (Sundays 03:00, all scheduled at once)

find-own-accounts ──► lookup-venues.week ──► scrape-tiktok.week
                                        ├──► scrape-instagram.week
                                        ├──► scrape-blogs.week
                                        ├──► scrape-accounts.week
                                        ├──► scrape-venue-social.week
                                        ├──► read-mentioned-profiles.week ──► (the same five scrapes), match-mentions
                                        └──► match-mentions ─► read-posts
```

Because each box has one id per city and month (or week), `lookup-venues.month` runs once even though four operations ask for it.

---

## 5. The LLM agents

| Agent | Tier | Called from | Purpose | How |
|---|---|---|---|---|
| `PostGateAgent` | mini | `read-posts.post`, `reread-posts.post` | Is the post about eating or drinking out in the city (else a skip reason) | `DurableLlmService` child, one post a call |
| `PostClaimsAgent` (agent A) | full | `read-posts.post`, `reread-posts.post`, `reflag-openings.post` | The post's places and claims (each claim's foods, number, quote) | child per call; long posts 1 + parts calls |
| `ReviewClaimsAgent` (agent A) | mini | `read-reviews.review`; the `reread-reviews` backlog | The review's claims | child per review; plain inside the backlog |
| `CommentIntentAgent` | mini | `read-comments.post` | A comment's intent (question and its topic, disagreement, …) | child per comment |
| `CommentDisagreementAgent` | mini | `read-comments.post` | One line on what the disagreeing comments say | child per post |
| `PressClassificationAgent` | mini | `classify-press.page` | Feature / listicle / passing / unrelated | child per page |
| `ProfilePlaceAgent` | mini | `read-mentioned-profiles.week` | Which place at a bio's address the profile is | child per profile |
| `VenueMatchAgent` | mini | `match-mentions.city` (`match mentions` step) | Which candidate venue or branch a mentioned name is | **inline in the step** (no wait for an account) |
| Jev `ClaimLabelsClassifier` | decision model, paid per call | `label claims` steps | Each claim's sentiment, aspect and kind | inline in the step; what it misses, the `statement-parts` backlog reads |

Outside the pipeline: `ReportAnalysisAgent`, `ReportEditorAgent` and `ReviewReplyAgent` (report build, by hand), `LandingCopyAgent` (landing cron), `TermTopicAgent` (the `terms` backlog; frequent narrower wordings become topics in code, no agent) and the aspect discovery agent (weekly cron).

---

## 6. Things to know

- **Apify concurrency.** Every Google Maps places run, Google review fetch, profile run, TikTok search and Instagram hashtag run goes through its atom, so through the `apify` queue (4 at most) and its credit wait; the dish searches' 564 runs are 564 children the queue paces. Every other actor run is a child of its operation's run too (TripAdvisor, the Instagram location actor, the comments scraper, the post-counts readers, Google search and news, Wolt and Lieferando, Google Trends, TheFork and OpenTable, the food-trends compare runs), so the `apify` queue paces everything at four runs: on the 2nd at 06:00 the independent month operations start together (`scrape-venues`, `scrape-tiktok`, `scrape-instagram`, `scrape-blogs`, `search-interest`, once per city) and wait their turn, and the Free plan's fifth concurrent job is the margin for a run started by hand. Every actor has its typed definition (`apify/actors/*.actor.ts`). `ApifyService.runActor`'s inline path (outside DBOS, or inside a step) serves no caller in the pipeline any more and is the next thing to remove (task `remaining-operations-as-workflows`).
- **A failed dependency fails its dependents** until an admin resumes it. On the 2nd, a failed `lookup-venues.month` stops every month operation downstream for that city.
- **Weeks and months are UTC.** A month operation always covers the month before the run day. A week operation covers its ISO week.
- **`read-posts.city` started as `match-mentions`' child has no dedupe.** Two can run for one city at once. They share the posts' fixed ids, so no post is read twice.
- **`reread-posts` is a nightly schedule** of 200 posts, while `reread-reviews` is still a backlog inside the day's shared token budget.
- **Not in the pipeline:** the report build (by hand), `landing-editions`, the city days, favicons and aspect discovery (pg-boss crons), the backlogs (22:00).
