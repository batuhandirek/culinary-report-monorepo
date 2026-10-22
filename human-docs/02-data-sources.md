# Data sources: what we fetch, from where, when, and what it feeds

Every paid fetch goes through Apify (a scraping marketplace: we rent "actors" by the run, each run capped in dollars). Free fetches are plain HTTP calls from our server. LLM work runs on OpenAI. Nothing is fetched without a cap, and every run is recorded with its cost (admin › Data › Apify costs).

Two words used throughout:

- **Report brands**: the month's 20 most talked-about brands in the city (by posts from other people) plus every subscriber, whatever its rank. Most per-venue sources are fetched only for these brands and their competitors. A chain's place figures (popular times, open tables, delivery and prices, search ranks, the neighbourhood) are fetched and reported for every open branch of it, each on its own; searches by name (press, TikTok search, comments) run once for the brand.
- **The report month**: the calendar month that ended. The run on 2 October builds September.

## 1. The venue list (who exists)

| Source | What we get | Scope | When | Cap | Limits |
|---|---|---|---|---|---|
| **Google Maps, city-wide list** (`compass/crawler-google-places`) | Name, address, category, rating, review count, phone, website, coordinates, basic amenities | "restaurant", "bar", "cafe" in the city, 1,000 places each | Quarterly, before the monthly run (the cron checks the date) | $20 | Google decides which 1,000 it returns, so busy places can be missing (Baba Pirzola, 3,000 reviews, was). A place seen for the first time with under 150 reviews counts as an **opening**; a place whose status flips counts as a **closure** or **reopening**. |
| **Google Maps name lookups** (same actor) | Up to 3 places per name | Names that posts mentioned and nothing in the list matched (up to 500 a month) | Monthly, inside the run | $6 | A name is searched once, and again only when it is still unmatched three months later (a place creators named before Google listed it). Never counts as an opening. |
| **Google Maps brand search** (same actor) | 40 places per brand name | Every chain's name in the city, or one brand on demand ("Find branches") | Quarterly after the city list; on demand | $2 | Finds new branches and look-alikes; only places on the brand's own website join the brand by themselves, the rest are offered. |
| **OpenStreetMap** (Overpass API, free) | Every food or drink amenity and shop inside the city boundary: name, kind, position, address | Whole city | Monthly, before the run | $0 | A **checklist only**: OSM data never reaches a report or the portal (licence). Berlin: 13,786 named places against 4,991 venues. |
| **OSM lookups** (Google Maps by name + address) | One Google place per OSM place | OSM places no venue matches, sit-down kinds first | Monthly, after the sync | $10 (~2,000 places) | Each place searched once ever. Closes the gap the capped city list leaves; after the first months it costs cents. |
| **Google Maps detail pages** (same actor, detail mode) | Opening hours, amenities by section, all-time star distribution, photo count, reservation link, "people often mention" review tags, menu link, delivery links, popular times, "people also search for" | Report brands' branches + competitors | Monthly (`REFRESH_VENUE_DETAILS`) and twice weekly as busyness samples | $2 / $1 | **Popular times, delivery links and "people also search" have never come back** for any venue (ticket `popular-times-and-order-online-source`). Review tags do. |
| **Website icons** (plain fetch) | The venue's favicon for the admin lists | Due venues' websites, one fetch per website (a chain's branches share it), up to 20 min an hour | Hourly | $0 | Cosmetic. |

## 2. What people post (social listening)

| Source | What we get | Scope | When | Cap | Limits |
|---|---|---|---|---|---|
| **TikTok hashtag feeds** (`clockworks/tiktok-scraper`) | Videos with caption, hashtags, tagged place, views, likes, comments, shares, saves, subtitles (downloaded at once, they expire) | The city's enabled hashtags (Berlin: 20), a short page per tag (~25 weekly, ~40 at month end) | **Weekly**, Sundays 03:00 UTC, plus a month-end pass in the monthly run | ~$2 a week + ~$3 at month end | **The feed ignores date filters**: a September run returned videos from November 2025 to October 2026, 3 of 20 in September. Scraping a short page every week keeps the newest videos of each week; the rest is paid for and discarded. |
| **TikTok keyword search** (`novi/advanced-search-tiktok-api`) | Same video objects, by relevance, last three months, in the city's region | The city's search queries (Berlin: 24, e.g. "berlin ramen", "kreuzberg food") and, later in the monthly run, each report brand's name | **Weekly** (last week's videos, 30 a query), plus a month-end pass (last three months, 50 a query) and the brand names monthly | $4 cap a run (spends ~$0.60); half of $8 | At least 30 results per query, so one run covers all. The actor refuses caps under $4, so each run's search gets at least that. This is where most of a month's TikTok posts come from. |
| **Instagram hashtag feeds** (`apify/instagram-scraper`) | Posts and reels with caption, hashtags, tagged place, likes, comments, views (reels) | The city's Instagram hashtags (Berlin: 20): posts and the tag's top reels | Monthly ($8); the **posts feed daily** at 04:00 UTC ($2); the **top reels weekly**, Sundays 03:00 UTC ($1) | $8 + ~$1.50/day + ~$0.11/week | On the Free plan a hashtag gives **one page per run** (5–27 posts, the newest), hence the daily run. No follower counts; like counts often hidden. Reels (the high-view content) come a few per tag, weekly and in the monthly run. |
| **Instagram place pages** (`scraping_solutions/instagram-location-posts-local-creator-finder`) | Posts tagged at the venue's location | Each report brand, searched once by its name, 30 posts | Monthly | half of $8 | Name search can hit a namesake; every place is checked against the venue's name. |
| **TikTok comments** (`clockworks/tiktok-comments-scraper`) | Up to 100 top-level comments per post, most liked first, without authors | The five most viewed TikTok posts of the month per report brand | Monthly | $13 | TikTok only; Instagram comments are not scraped. A post is scraped once ever. |
| **Own accounts** (`apify/instagram-profile-scraper`, `clockworks/tiktok-profile-scraper`) | Followers, post count, average views and likes over the latest ten, posts in the last 30 days | The accounts linked to report brands (matched by handle or website, from outreach, or added by an admin) | Monthly | $2 | One snapshot per account per month: the first month has no change figure. |

**What the LLM extracts from each post** (gpt-5.4-mini): every venue named or tagged (with the post's own location hint, the cuisine in our food-topic vocabulary, the city if stated), whether the creator visited, sentiment, a one-line summary, dishes, praise and complaints by topic (food, drinks, service, vibe, price, payment, wait, cleanliness), and whether the post is paid or gifted. A matcher then links each mention to a venue (exact or fuzzy name match; the LLM decides close calls among up to five candidates). A post by a brand's own account is stored as its own post and **never counted as word of mouth**.

## 3. What guests write (reviews)

| Source | What we get | Scope | When | Cap | Limits |
|---|---|---|---|---|---|
| **Google reviews** (`compass/Google-Maps-Reviews-Scraper`) | Every review from the month's first day, or from six months before the month for a venue with no earlier review stored (its first scrape: a brand new to the top 20, a new competitor); stars, text, translation, language, date, owner reply; plus the venue's all-time rating and count that day (a **rating snapshot**) | Report brands' **every** branch + competitors | Monthly | $12 (a tenth goes to TripAdvisor; of the rest, at most 40 % to the six-month backfill) | Only report brands and competitors have reviews stored at all. The rating history starts at the first scrape (no source for past ratings). No reviewer names are stored. |
| **Google reviews, weekly watch** (same actor) | Reviews of the last 10 days | Subscribers' branches only | Mondays 05:00 UTC | $1 | Feeds the critical-review alert e-mail. |
| **TripAdvisor** (page found by `apify/google-search-scraper`, reviews by `scrapeunblocker/tripadvisor-reviews-scraper`) | The month's reviews (title + text, no reviewer), the page's all-time rating | Every branch of the report brands; each page is searched once ever | Monthly, inside the reviews budget | ~$0.50 | Berlin: 6 venues have a page so far. The report shows "locals (Google) vs visitors (TripAdvisor)" only for these. |

**What the LLM extracts from each review** (gpt-5.4-mini, batches of 10): sentiment, praise and complaints by topic, dishes named, and **changes the reviewer noticed** ("new owner", "prices went up"). Topics count sources, not points: a review listing three service complaints counts once.

## 4. Where guests look (demand and discovery)

| Source | What we get | Scope | When | Cap | Limits |
|---|---|---|---|---|---|
| **Google Maps search ranks** (`compass/crawler-google-places`, no map grid, Google's own order) | The venue's rank and the top ten for "ramen Mitte"-style searches: its food topics × its district, up to three queries | Every branch of the report brands | Monthly | $4 | A venue without a district gets no queries. Every place found is saved as a venue. |
| **Google Trends** (`signalbench/google-trends-scraper`) | Weekly search interest over 12 months in the city's region (DE-BE), per term, plus Google's top and rising related queries | Every food topic with a Trends id (~110) and subscribers' names | Monthly | $2 | **Per term only**: 100 is each term's own peak, so terms can't be ranked against each other. Small venues' names have too little data. |
| **Booking pages**: Google's own booking page (free fetch), TheFork (`clearpath/thefork-scraper`), OpenTable (`canadesk/opentable`) | Which 15-minute slots are still open on Friday and Saturday 18:00–22:00 for two → a "booked out" share | Every open venue with a booking link (Berlin: 569), subscribers and report brands first, up to 600 | Thursdays 19:00 city time | $1 (Google is free) | Quandoo shut down (Sept 2026), no provider for Resmio/OpenTable-less sites. Google's page needs a consent cookie and paces at ~1 h per 600 venues. |
| **Google popular times** (detail pages, see above) | The weekly busyness histogram and the live percent | Every branch of the report brands + competitors | Thursdays and Saturdays 19:00 city time | $1 | **Returns nothing today** (see above). The report's "Did the buzz fill the place?" section has never rendered. |
| **Delivery apps**: Wolt (`needy_hammock/wolt-restaurant-menu-scraper`), Lieferando (`studio-amba/takeaway-scraper`) | Wolt: rating, fees, the whole menu with prices. Lieferando: rating, fees, min order from the city listing, matched by name and postcode | Every branch of the report brands + competitors | Monthly | $7 | Wolt needs the link from Google's "Order online", which never comes back, so **no menu has ever been stored**; Lieferando listings work (12 on dev). |
| **Press**: Google News (`scrapewise/google-news-scraper`) and Google web search (`apify/google-search-scraper`) | Articles and pages naming the venue in the month: outlet, title, snippet, date; an LLM sorts feature / listicle / passing / unrelated | Each report brand once, its name + city | Monthly | $3 | Directory, booking and delivery sites are filtered out. Namesakes are dropped. |

## 5. Context (free)

| Source | What we get | Scope | When |
|---|---|---|---|
| **Open-Meteo archive** | Daily max temperature and rain per city | Every active city | Daily 05:00 UTC, last 7 days refetched |
| **Nager.Date** | National and regional public holidays | Per country and region (DE-BE) | Same |
| **Admin-entered events** | School holidays, marathons, fairs: name and dates | Per city | By hand |

Used for one clause in the report ("with rain on 3 of 4 weekends") and to shade the portal's charts. Never claimed as a cause.

## 6. What people enter by hand

- **Admins**: the city (hashtags, searches, districts and postal codes, name stopwords, chain deny list, budgets), food topics and their aliases, competitor lists, own-account links and rejections, mention corrections ("this post is about X"), brand merges and splits, booking links, prospects and their contact details, events.
- **Owners (portal)**: competitor picks (up to five), "I answered this review", contact e-mail and language.

## 7. What we deliberately do not collect

- Reviewer names, review URLs, comment authors, Google Maps Q&A (personal data).
- Anything from OSM beyond the checklist (licence: showing it would require attribution and share-alike).
- Instagram comments and Instagram follower counts of posting creators (not available on the actors we use on the Free plan).
- The venue's own Google Business Profile insights (impressions, calls, direction requests): only the owner can grant access. See the ideas doc.

## 8. Which sections each source feeds

| Report section | Sources |
|---|---|
| Cover facts, amenities, star distribution, rating trend | Google Maps list + detail pages, rating snapshots from the review scrape |
| Posts, views, creators, sentiment, topics, dishes | TikTok hashtags + searches, Instagram hashtags + place pages, LLM extraction |
| What decides the stars, critical reviews, changes noticed, reply drafts | Google (+ TripAdvisor) reviews, LLM analysis, gpt-5.4 for drafts |
| Competitors | The same for each competitor, the admin's or owner's list |
| Where guests find you | Search ranks |
| What the city is talking about | Every matched mention in the city; Google Trends for the search column |
| Did the buzz fill the place? / Weekend tables | Popular times samples (empty today), booking page samples |
| Your prices next to theirs | Wolt menus (empty today), Lieferando listings, price complaints from reviews |
| What followed what | Posts and reviews over the month and the six before |
| Own accounts, comments, press, locals vs visitors | Profile scrapes, TikTok comments, Google News + web search, TripAdvisor |
| Openings and closures nearby | The quarterly city list's status changes |
| Weather and holidays | Open-Meteo, Nager.Date, admin events |
