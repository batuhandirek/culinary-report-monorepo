# Business brief: what it does, the value, who it helps, churn, B2B, market research

Six questions a business planner asks, answered from what the product actually does today ([02](02-data-sources.md), [04](04-report-contents.md)) and what the data it already holds would allow ([07](07-ideas-report-types-and-features.md), [13](13-public-reports-and-marketing-content.md)). Where something is possible but not built, it says so.

## 1. What the product does, exactly

**It listens**
- Scrapes TikTok and Instagram for everything posted about food in a city: the city's hashtags and search queries, the top brands' names, the places' Instagram location pages.
- Scrapes Google and TripAdvisor reviews of the brands it reports on and their competitors, with the owner's replies.
- Scrapes Google Maps: every restaurant, bar and café in the city (quarterly), their details (hours, amenities, review tags), the results a guest sees for "ramen Mitte", and the openings and closures between scrapes.
- Reads press (Google News and web search), delivery listings (Lieferando, Wolt), booking pages (open Friday and Saturday tables), Google Trends per kind of food, the weather and public holidays.
- Watches subscribers' reviews weekly.

**It understands**
- An LLM reads every post and review: which venues are named, with what sentiment, which dishes, what is praised and criticised (food, drinks, service, vibe, price, payment, wait, cleanliness, each point filed under one of about 60 themes such as "price increase" or "cash only"), whether the post is paid, whether the creator visited, and what changed ("new owner", "prices went up"). Because the themes are the same everywhere, they add up across a city: the admin's Trends page shows, for each month, how many written reviews and posts raised each theme and at which venues (in Berlin in September 2026, "cash only" was criticised in 24 written reviews at 5 venues). Review counts cover the venues we scrape reviews for (report venues and their competitors), not every venue in the city.
- A matcher links each mention to the right place, including the right branch of a chain, and tells a brand's own account from word of mouth.
- A food-topic vocabulary (cuisines, dishes, drinks, diets, formats) resolves every mention and every Google category to the same terms, so "Pho", "Vietnamese" and "Asia Imbiss" can be compared.

**It compares**
- Each brand against up to five competitors on the same month, on percentages, never on raw counts where budgets differ.
- Each brand against the city's other report brands (median and percentile) and against the city's rising cuisines and dishes.
- Each month against the one before, and the actions suggested last month against what the numbers show.
- Each branch of a chain against its siblings.

**It reports**
- A monthly report per brand and city: a cover story, three findings, two or three actions, then the evidence section by section, as a private link and a PDF.
- Ready-to-post reply drafts for unanswered reviews, in the review's language.
- A weekly alert e-mail per critical review, with a draft.
- A portal with every month's report, a review queue, the posts and creators, six-month trends against competitors, a patterns page, competitor picks.

**It sells itself**
- Scores every brand in the city as a lead (buzz, already spends, a nameable problem, reachable, press), suggests prospects, writes a one-sentence hook from their own report, fills outreach templates, logs every touch, schedules follow-ups, mails the report to subscribers automatically.

**It runs itself**
- One monthly run per city on the 2nd, daily and weekly crons, every paid step capped in dollars, every run recorded with its cost, restarts resumed without paying twice, a city added as a row in a form.

## 2. Value propositions, and the full scope of the capabilities

**For the owner of one place** (the core sale)
- *One page a month on what the internet says about you*, from sources you would need hours to read and could not count.
- *Why guests give 4 instead of 5*: the one topic that separates your 5-star reviews from the rest, with quotes.
- *Which creators matter and whom to invite next*: who posted, how big they are, whether they visited, who covers your neighbours but not you.
- *Answer every bad review in minutes*: drafts written from the review, a weekly alert so nothing sits unanswered for a month.
- *Know where you stand*: against the competitors you pick, against the city's other talked-about places, against the trend of your kind of food.
- *What to do next month*, and a record of whether it worked.

**For a chain**
- One report per city with a branch-by-branch comparison, or one across cities; every branch's reviews in one queue.

**For the full scope of what the machinery can do** (built, but not all packaged)
- A living census of a city's food venues (Berlin: 4,991 places, 4,716 brands, chains resolved), refreshed quarterly and checked against OpenStreetMap.
- A city-wide listening feed with every mention resolved to a venue, a brand and a kind of food.
- A supply / buzz / demand view per kind of food: how many places serve it, how much people post about it, how much people search for it.
- District-level demand: how booked out Friday and Saturday evenings are, by district (free, from Google's booking pages).
- A reviews corpus (16,000 and growing) with topics, dishes, changes noticed and reply rates.
- A creator map of the city: who posts about food, reach, paid versus organic, whom they cover.
- Lead scoring and an outreach log that work for any product sold to venues, not only this one.

## 3. Pain points solved, by function

Read each from two sides: for the venue (the customer), and for us (the team selling and running the product).

**Sales**
- *For the venue*: knowing whether buzz fills the place (booked-out evenings, reviews after a viral week), whether paid posts outperform organic ones, whether the delivery listing and prices hold up next to competitors, and where guests find them on Google Maps.
- *For us*: knowing whom to call (the lead score names a problem, a budget signal and a way to reach them), what to say (a hook from their own data, templates filled in), what to show (their own report as the sample), when to follow up (the sequence), and how to get past Germany's cold-e-mail consent wall (calls, visits, gated content).

**Marketing**
- *For the venue*: which dishes and topics to lead with, which creators to invite and which to thank, what viewers ask under the videos (location, prices, reservations) and the posts that would answer them, whether their own account's posts reach anyone compared with creators', whether they appeared in the press, when to post.
- *For us*: public pieces from the same data (top hits, trends, openings, a benchmark PDF) that bring owners in, and a blog that ends on the sample-report pitch ([13](13-public-reports-and-marketing-content.md)).

**Customer success**
- *For the venue's own guest care*: the critical reviews surfaced within a week with a reply ready, the complaints clustered by hour so the cause is findable, changes guests noticed as early warnings, a "needs a reply" queue the staff can work.
- *For us keeping subscribers*: a monthly deliverable with new findings each time, the follow-up on last month's actions (progress is visible), the portal's six-month series (value grows with tenure), the weekly alert (a habit), owner picks and corrections (investment), the Today page listing subscribers without a report or with one unsent so nothing lapses.

## 4. A churn-preventing machine

Two kinds of churn, and the product bears on both.

**Guests not coming back (the venue's churn)**
- The 5-star split names the one thing that costs them repeat visits, every month, with the share of reviews that raise it.
- Changes guests noticed ("new owner", "smaller portions", "card only") are the earliest written sign that regulars are drifting; the report leads with them.
- Critical reviews are caught within a week and answered with a draft, so a public complaint does not stand unanswered.
- Complaint times by hour and by topic point at a shift, not a feeling.
- The rating trend and the month-over-month band make a slow decline visible before it is a crisis.
- What is missing to close the loop: the venue's own guest data (covers, reservations, repeat rates from a POS or booking system). The patterns page is built to take it. With it, "did the action move the number?" becomes answerable.

**Subscribers leaving (our churn)**
- Every report is new work on new data, with last month's actions followed up: it reads as progress, not a dashboard.
- The weekly alert gives a reason to open something every week, not once a month.
- Tenure compounds: six months of series, patterns and competitor history that a new provider cannot reproduce.
- The owner's own inputs (competitor picks, "I answered it", corrections) make the product theirs.
- The Today page lists customers whose report is missing, unsent or stale, so a lapse is seen before the renewal conversation.
- The honest risks today: empty sections (busyness, menus) read as a thin product; English reports for German owners; a month with a scrape failure looks like a quiet month. The fixes are in [06](06-data-completeness.md) and [12](12-open-decisions.md).

**As a product for others' churn**
- A delivery or booking platform could run the same signals over its venues to see which are losing reputation (complaint share rising, reply rate falling, buzz gone) and intervene; a supplier could see which accounts are at risk. This is a data service, not a report ([section 5](#5-b2b-services-market-conditions-and-trends)).

## 5. B2B services, market conditions and trends

**What is shifting around the product**
- Discovery of places has moved to short video: a creator's visit now does what a newspaper review did, and owners can neither see nor count it. Listening tools are built for brands with marketing teams, not for a kebab shop.
- Guests expect answers to reviews, and Google's own surfaces reward replies and recency; most owners answer almost none (Berlin dev data: 19 % of written reviews in September).
- Generative models made reading thousands of posts and reviews cheap; the cost moved to getting the data (scraping platforms that fight it, paid actors, plan limits) and to being right about which venue is meant. That matching layer and the venue census are the defensible part.
- The EU's consent regime (GDPR, and Germany's UWG for cold contact) shapes the sales motion: visits, calls, inbound content with consent, and the owner granting access to their own platform data (Google Business Profile) rather than us scraping it.
- Platform risk is real: an actor cut to one page per hashtag, a booking site shutting down (Quandoo in September 2026), a detail field that stops coming back (popular times). The architecture already treats every source as optional and every figure as "absent, not zero".

**Services that can be built on it**
- *Tiers for venues*: a weekly pulse (cheap), the monthly report (core), a chain tier (branch comparison, several cities), done-for-you review replies with the owner's Google access, one-off creator briefs and competitor deep-dives.
- *Agencies and consultants*: hospitality marketing agencies white-labelling the report for their clients; a per-seat admin for them.
- *Platforms*: a per-venue signal feed (buzz, complaint share, reply rate, booked-out share, rising/falling) for delivery, booking and POS vendors, sold as an API or a monthly file; "venues rising in buzz that are not on your platform yet" as a sales list for them.
- *Real estate and food halls*: district demand and turnover (openings, closures, booked-out medians, price levels) for site selection and tenant mix.
- *Suppliers and wholesalers*: dish and ingredient trends by district, and which accounts are growing.
- *Tourism boards and district associations*: the district's reputation and reach, visitors versus locals.
- *Creators and venues as two sides*: a matching service (which creators cover this kind of food in this district, what their posts do) with briefs and tracking; the creator leaderboard is the public face of it.
- *Benchmarks and data stories*: a yearly city benchmark sold or gated, quarterly trend reports, press pitches.
- *Geographic expansion*: a city is a form; the constraint is the per-city scraping budget on the Free plan and the local sources (hashtags, queries) someone has to curate. Franchising a city to a local partner (they sell and visit, the platform runs) fits the model.

## 6. How the project simplifies market research and analysis

- **A city census in one table**: every food venue with category, district, rating, review count, website, phone, chain membership, openings and closures, checked against OpenStreetMap for completeness.
- **One vocabulary across sources**: posts, Google categories, dishes, delivery menus, Google's review tags and Google Trends all resolve to the same food topics, so a question like "is matcha growing in Mitte" has one answer from three sides (venues serving it, posts about it, searches for it).
- **Shares, not counts**: trend tables sum to 100 within a month, so budgets and scrape timing do not masquerade as trends; deltas are in points.
- **Demand without a survey**: booked-out shares from booking pages for 569 Berlin venues, medians by district, a weekly index nobody else publishes.
- **The reviews corpus as a research set**: complaint and praise shares by category and district, reply rates, "changes noticed" as an ownership-turnover and price-change signal, review languages as a visitor proxy, all with personal data left out.
- **The creator landscape**: who covers food in the city, reach, paid versus organic share, which venues and districts they cover, month by month.
- **Competitor sets by shared food**, computed, not guessed, for any venue in the city.
- **Context attached**: weather, holidays and events per day, so a quiet week can be read against the calendar.
- **Comparable months**: the Data page says which months are complete and what each step found, so a researcher knows what a number covers.
- **Where it comes out**: the admin's Trends pages (topics, dishes, districts, creators, searches, openings), the Data page, SQL on the database, and the public pieces in [13](13-public-reports-and-marketing-content.md). A CSV export is a small addition ([07](07-ideas-report-types-and-features.md)).
- **What to keep in mind**: coverage follows the city's hashtags and queries and the top-20 selection; reviews exist only for report brands and competitors; nothing from OpenStreetMap may be published; a public analysis should work with our own counts, not Google's.
