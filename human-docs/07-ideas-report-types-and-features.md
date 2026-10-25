# Ideas: other report types, other buyers, more features

A brainstorm, sorted by how much of the data already exists. Nothing here is decided. Public and marketing pieces are in [13-public-reports-and-marketing-content.md](13-public-reports-and-marketing-content.md).

## Report types for the same buyer (the owner)

A report type is now a setting: a brand can have several **report configurations**, each a report it gets every month, with the sections it shows, in which order, and a few settings per section (the cover's figures, which platforms' posts, how many posts and dishes, which place blocks). A configuration starts as a copy of a **template** (four are ready-made: **Full report**, the default for brands without one, **Social buzz**, **Reviews and reputation**, **Competitor watch**) or from scratch, and an admin names it, edits it or pauses it for that brand alone. The ideas below that only leave things out or reorder them can be a configuration today; the ones that need new data or another period (weekly, quarterly, a first 90 days) still need building.

| Type | What it is | Data exists? | Notes |
|---|---|---|---|
| **Monthly brand report** (today) | The full picture, once a month | Yes | The product |
| **Weekly pulse** | One screen: new posts and views, new reviews with drafts, anything critical, one line of advice | Mostly: the review watch exists; posts need weekly listening (`continuous-listening`) | Cheap to send (an e-mail from stored data); the thing a subscriber opens every Monday. Could be the cheaper tier |
| **Launch report** (first 90 days) | For a place that just opened: first creators, first reviews, what the first guests said, search rank from day one | Partly (openings from posts that say so; the city list's from 2027) | New places are the warmest leads (PROSPECTS.md: Döner Pro, Choc-Spot, Chef City) and have no history to compare, so the report is forward-looking: targets instead of deltas |
| **Chain HQ report** | One page per city plus a branch league table across cities | Yes (across-cities scope exists) | Higher price point; the per-branch task (`per-branch-place-data`) makes every branch's place data real |
| **Competitor deep-dive** (one-off) | One competitor in full: their creators, their complaints, their prices, their booked-out evenings | Yes for tracked competitors | A one-off sale on top of the subscription |
| **Creator brief** (one-off) | A shortlist of 10 creators to invite, with reach, what they covered, visited or not, paid or not, a DM draft each | Yes (TikTok); Instagram needs follower scrapes | Owners ask "who should I invite?" more than anything else that is not a bad review |
| **Quarter in review** | Three months, the trend lines, what the actions did, the neighbourhood's changes | Yes (the portal's series) | A PDF the owner shows a partner or a bank |
| **Review-reply service** | Not a report: we post the replies (with the owner's Google access) | Needs Google Business Profile access | Done-for-you tier; the drafts already exist |
| **Menu and price report** | Your menu vs the district's, dish by dish, with what reviews say about value | Needs menus (Wolt links); prices per kind of food are worked out once menus exist | Blocked on the order-online source |

## Other buyers for the same data

| Buyer | What they would pay for | Data exists? |
|---|---|---|
| **Delivery platforms, booking platforms** | Which venues are rising in buzz but not on their platform; which of their venues get complaints about delivery | Yes (listings + mentions) |
| **Suppliers and wholesalers** | Which dishes and ingredients are rising, in which districts; which venues are growing | Yes (dishes, trends) |
| **Landlords, food halls, developers** | District demand: posts, booked-out medians, openings and closures by street | Partly (booked-out samples; openings from posts now, the city list's from 2027) |
| **Tourism boards, district associations** | The district's reputation: praise and complaint shares, press, creator reach, visitors vs locals | Yes (aggregates) |
| **Creators and agencies** | Which venues are under-covered relative to reviews; who already works with creators | Yes |
| **Press** | Data stories (see the public doc) | Yes |

## Portal features (for the subscriber)

Sorted by effort; "data exists" means no new scraping.

**Small, data exists**
- **Review language split** as a visitor proxy (share of reviews in English / Turkish / …): the language is stored on every review and unused.
- **Rating benchmark over time**: your rating vs the district's and your kind of food's median and percentile is on the report's cover since 2026-10-22 (`rating-benchmark-in-report`); a portal chart of it month by month is the idea left.
- **Best time to post**: views by weekday and hour of the city's posts in your category.
- **"Hours" complaints vs listed hours** (opening hours are stored).
- **Export** (CSV of reviews and posts with topics) and a **print per branch**.
- **Goal tracking**: set a target (reply rate 80 %, stars 4.5), see it on the series.
- **Mark a creator as "invited" / "worked with"** and see what their next post did.
- **Competitor alerts**: a competitor's rating drops, or a creator with 100k+ posts about them.

**Medium, data exists**
- **Ask the report**: a chat over the brand's own data ("what did people say about the terrace?"), grounded in the stored posts and reviews only.
- **Praise board**: a staff-facing page of this month's praise by topic and dish, to print for the kitchen.
- **Reply from the portal**: with the owner's Google access, post the draft in one click; track which replies were posted.
- **Owner inputs on the patterns page**: covers per day, promotions and events, a menu change date; the week chart overlays them. Turns "followed by" into something the owner can judge.
- **German UI and German reports** (`report-language`).
- **Multi-user**: owner, manager, agency, with per-branch access.

**Larger, new data**
- **Google Business Profile connection** (OAuth): impressions, searches by keyword, calls, direction requests, photo views. The single most valuable signal, and the owner's to give. Also unlocks posting replies.
- **Instagram / TikTok account connection**: the venue's own insights, story mentions and tags (invisible to scraping).
- **Reservation / POS connection** (OpenTable, Resmio, Lightspeed exports): the real "did it fill the place".
- **Menu upload** (PDF or photo): dish-level matching without delivery links.
- **WhatsApp / Telegram alerts** for critical reviews, next to e-mail.
- **A "second city" for a chain** is already supported; a second country needs language (extraction and analysis are English already; the city's language drives prompts).

## Admin and sales features

- **Prospect freshness**: watch "contacted" and "replied" prospects' reviews weekly, so the follow-up quotes this week's review (B.10 in the completeness doc).
- **Selling on foot**: a visit script, the visit's outcome and e-mail consent on the log, an A5 leave-behind with a QR code to the report, a round planner by district with opening hours (`visit-first-outreach`, in progress). E-mail discovery from Impressum pages is parked (`impressum-contact-scrape`); the Instagram handle can come from the website or the matcher (already linked for 535 accounts; the prospect's `instagram` field is still empty for all 21).
- **One-image pitch**: the report's cover and three findings rendered as an image for a DM or WhatsApp (the share-card renderer from the public doc).
- **Lead list widening**: a cheap review sample for the top 100 brands by buzz, so the "problem" signal is known for more than the report brands (B.9).
- **Pipeline health in one number**: the Data page shows steps; a "month completeness %" per city (steps succeeded × data present) would make the Today page's "finish the month" decision obvious.
- **Second-city playbook**: the city form exists; a checklist (hashtags, searches, districts, deny list, OSM id, budgets, a first city list) with the first month's expected cost.
