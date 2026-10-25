# The questions an owner asks, and which we answer

Answered = a section shows it when the data exists. Partly = shown with a caveat or only for some venues. Not = nothing in the product. The last column is what would close the gap; the costs are rough, per city per month, on the actors we already use unless said otherwise.

## Attention: who talks about me

| Question | Status | Where | Caveat / what would answer it |
|---|---|---|---|
| How many people posted about me, and how many saw it? | Answered | Month in numbers, What people posted | Only posts our hashtags and searches found. TikTok coverage depends on the search queries; Instagram on one page per tag per day. Weekly TikTok listening (`continuous-listening`) and more search queries per city raise coverage. |
| Who are the creators, how big are they, and did they actually visit? | Answered | The people behind the posts | Instagram creators have no follower count, so they never rank in "worth inviting". A profile scrape of the month's top Instagram creators (~$0.002 a profile) would fix that. |
| Was the post paid? Does paid work better than organic? | Answered | Posts list; What followed what | Floors: 3 posts, 10 reviews. |
| Which creator should I invite next? | Answered | Worth inviting | District neighbours only; a creator covering the same cuisine elsewhere in the city is not offered. |
| Is my own Instagram/TikTok working? | Partly | Your own accounts | Only when the account is linked and snapshotted; the first month has no change. Instagram story mentions and tags of the venue are invisible without the owner's login. |
| What do viewers ask under the videos? | Partly | What viewers said | TikTok only. |
| Was I in the press or on a "best of" list? | Answered | In the press | Google's index only; newsletters (Mit Vergnügen, Tip, Berlin Food Stories) appear only when Google indexes them that month. |
| Did a post bring guests through the door? | Partly | Did the buzz fill the place?; What followed what | The direct proxy (Google popular times) returns nothing today. The indirect one (reviews after the viewed week) needs six months of reviews, which first-time report brands don't have. The real answer is the owner's own numbers (covers, revenue, reservations) or their Google Business Profile insights. See the ideas doc. |

## Reputation: what guests think

| Question | Status | Where | Caveat / what would answer it |
|---|---|---|---|
| What do guests praise and complain about? | Answered | Google reviews; What decides the stars | Written reviews only (about 60 % of Google reviews on dev). |
| What keeps a 4 from being a 5? | Answered | What decides the stars | Needs 3+ written reviews on each side. |
| Did something change (new owner, prices, quality)? | Answered | Changes guests noticed | |
| How do I answer this review? | Answered | Replies ready to post; the weekly alert mail; the portal queue | Subscribers only for the weekly alert. |
| Is my rating getting better or worse? | Partly | Cover sparkline | Snapshots exist only from when we started scraping the venue; there is no way to backfill a rating history. Venues posted about or with 500+ reviews get one twice a week from late October 2026. |
| How does my rating compare with the district or my kind of food? | Answered | Cover (a single place), each place's header (a chain) | "4.3 ★ · above 70 % of Kreuzberg's 212 food venues · above 55 % of Berlin's 61 Döner & kebab places": the all-time Google rating against open food venues with 20+ reviews, free (no scrape). Left out where fewer than 5 such venues compare; a kind of food with fewer falls back to its parent (ramen → Japanese). Reports built before 22 October 2026 lack it until rebuilt. |
| What do tourists think vs locals? | Partly | Locals vs visitors | Only 6 venues have a TripAdvisor page. The **language of each Google review is stored** and unused: a "share of reviews in English / other languages" line is a free visitor proxy. |
| Which dishes sell the story? | Answered | On the menu | |
| What do delivery customers say? | Partly | Your prices next to theirs | Ratings and fees only; delivery review texts are not scraped (Lieferando's actor does not return them; Wolt's might with its link). |
| How long do my guests wait, and is that worse than elsewhere? | Partly | Not in the report yet; admin only (`GET /admin/feedback/wait-complaints`) | Every waiting complaint is stored with the minutes it states when it states them: in Berlin in September 2026, 43 places had one (176 reviews and posts), and the 58 that named a wait had a median of 40 minutes. Older points get their stated number read back a little each night, for free. A report line ("guests named waits of 30–45 minutes, the city's median is 40") is the next step. |
| Which dish do guests complain about? | Partly | What came up (themes under each topic) | Each praise or complaint point is linked to the dish it is about when the review names one, so "the burger got pricier" counts for the burger; older points are linked a little each night. Not broken down by dish in the report yet. |
| Are my opening hours a complaint? | Partly | Topics ("other"), hours are stored but not reported | Hours are in the data; a "complaints mentioning hours vs your listed hours" line is cheap. |
| Is anyone naming my staff? | Not | | The LLM extracts "service" details; names are left out on purpose (personal data). |

## Discovery: where guests look

| Question | Status | Where | Caveat / what would answer it |
|---|---|---|---|
| Do I show up on Google Maps for "ramen Mitte"? | Answered | Where guests find you | Three queries, from the venue's food topics and district. |
| Are people searching for my name more? | Partly | Trends page (admin) | Pulled only for subscribers' names; a small name has too little data. Pulling the 20 report brands' names costs ~$0.08 more a month. |
| Is my kind of food rising or falling in the city? | Answered | What the city is talking about | City section needs 200 matched mentions in the month. |
| Am I expensive for what I am? | Partly | Your prices next to theirs | No menu today (Wolt link missing); competitors with 5+ written reviews for the price-complaint comparison. Once menus are stored, the block leads with the place's own kind of food against the same on the others' menus ("your ramen €14.50, theirs €12.90"), shown only when at least one other menu has it. |
| How booked out am I compared with the street? | Answered | Weekend tables | Only venues with a Google / TheFork / OpenTable booking page (569 in Berlin); 5+ sampled venues for a district median. |
| What opened or closed around me? | Answered | Openings and closures nearby | Openings come from creators' posts that say a place just opened (posts read before 22 October 2026 can be read again for it, and Berlin's October was: about 1 in 15 posts naming a place is flagged, and about 1 flag in 5 is wrong, e.g. a place telling how long it has been open); the city list adds its openings and closures from the second quarterly list (January 2027). Places nobody posts about stay invisible until then. An OSM-based signal would be earlier but cannot be shown (licence). |
| Who are my real competitors? | Partly | How you compare | Suggested from shared food, district, price level, Google's "people also search" (never returned so far); the owner can pick. |

## Business: the questions we cannot answer from the outside

| Question | What it would take |
|---|---|
| How many covers / how much revenue did the month bring, and did the buzz move it? | The owner's numbers: a portal form (covers per day, or a POS/reservation export) correlated with views by week. The patterns page is built for exactly this join. |
| How many people looked at my Google listing, called, asked for directions? | Google Business Profile API with the owner's consent (OAuth). The single richest signal available, and it is theirs to grant. |
| Who are my guests (age, where from, how they found me)? | Not inferable from scrapes beyond review language and TripAdvisor. A guest survey QR is a product, not data. |
| Is my ad spend working (Meta / TikTok ads)? | Ad accounts with the owner's consent. |
| Is a competitor's new menu or price change hurting me? | Menu scraping of competitors monthly (Wolt link needed) and a diff. |
| When should I post? | Views by weekday/hour of the city's posts are already stored; a "best posting hours in your category" line is a free addition. |
| Should I open on Mondays / later? | Busyness by hour (not returned today) plus booked-out by evening; partly answerable once popular times work. |
