# The admin panel for a salesperson

What `/admin` gives whoever sells and runs the product today. Pages are named as in the sidebar: Today · Brands, Social, Trends, Cities · Reports · Data · Blog · Users.

## Today (`/admin`)

The home page lists what is waiting, each line linking to where it is done: follow-ups due, replies to handle, subscribers without a report or with one unsent, brands scoring 60+ that are not on the sales list, failed pipeline runs, posts since the report month nothing could place, each city's report month not yet complete ("finish the month"), merge suggestions, accounts that look like a venue's own, unrecognised food words. Below: the report month's numbers, the sales stages, Apify spend this month, the next run date.

## Brands (`/admin/brands`)

Every brand in the city for a month, one row each: kind of food and district (or "N branches"), posts by others and the change on the month before, views, creators, rating, lead score, sales stage, whether the month's report exists. Segments: **Talked about** (default), **Sales list** (prospects not won), **Customers** (won), **Chains**, **All**. Tabs beside it: **Suggested prospects** (the top 20 by lead score with their signals, one-click "Add to sales") and **Look like one brand** (merge suggestions).

### The brand page (`/admin/brands/<id>`)

Header: name, icon, stage, score, rating (a chain's: its stars over all its places' reviews); month and city pickers; **Build report**; **Add to sales**. Tabs:

- **Overview**: the month's figures with changes, six months, the most viewed posts, the report, the sales card, own accounts, branches, and **todos** (what to do about this brand, each naming the tab).
- **Posts**, **Reviews** (the month, "needs a reply", all months), **Branches**, **Competitors** (list, suggestions, add a place or a whole rival), **Signals** (open tables, busyness, search ranks, rating over time, for any branch you pick), **Reports** (its report configurations: add one from a template or from scratch, rename, edit, pause; every month's reports, rebuild, share links, PDF, send), **Sales**, **Settings** (report scope, split).

### The Sales tab

- **Stage**: to contact → contacted → replied → won / lost / opted out. An outgoing touch moves to contacted; a logged reply moves to replied; the rest is the salesperson's choice.
- **Composer**: templates in English and German (first e-mail, report e-mail, follow-up, last try, DM, call script, visit script), filled with the venue, month, creators, posts, views, reviews and the **hook** (one sentence the app writes from the report; "Suggest a hook" rewrites it). Opens Gmail or a mailto link; the PDF can be attached; the touch is logged with the template's key, so copy can be compared later by reply rate.
- **Visits and calls**: the call and visit templates are scripts to read, not messages to send. Logging one records what happened: who you reached (the owner, staff, nobody, closed), **when to come back** ("the owner is in on Tuesdays after 15:00", which becomes the follow-up date and time), and whether **they said we may e-mail them**. The outcome never moves the stage: "spoke to the owner, said no" is your move to Lost.
- **The leave-behind**: an A5 page to print before a visit and leave at the counter (the visit template's "Print leave-behind", or the Reports tab): the report's cover title and headline, its three findings, the brand's name, your name and e-mail, and a QR code that opens the report's private link on their phone. Every scan counts as an open on that link, so you can see whether it was read.
- **Consent to e-mail**: cold e-mail to a German business needs their prior OK (UWG §7). A visit or call logged with "they said I may e-mail them" records it on the prospect (the Contact panel shows "E-mail OK since …"; Edit can tick or untick it by hand). Without it, and without a reply from them, the composer warns before an e-mail and hides the send buttons until you say you have their OK.
- **Follow-ups**: 4 days after the first try, 7 after the second, none after the third (then "lost" or a date); a visit's or call's come-back time wins over that. Due follow-ups show on Today.
- **Details**: contact name, e-mail, e-mail OK, phone, Instagram, language, notes. All empty today for the 21 prospects except 9 hooks.
- **Lead score panel**: the five signals with their values and what is missing ("press not searched", "no reviews in the window"), the deny-list flag.
- **Portal**: invite the owner by e-mail (a login code mail), see who has access.

### The lead score (0–100)

| Signal | Weight | What it reads |
|---|---|---|
| Buzz | 35 % | Posts by others, views, creators, as percentiles among the city's mentioned brands, this month and last |
| Already spends | 20 % | Own account posts, paid posts about it, a website |
| Nameable problem | 30 % | Complaint share, unanswered critical reviews, reply rate under 50 %, changes guests noticed, negative or mixed posts. Without reviews (most brands): the weakest branch's Google rating against its district's food venues (0 at the median or above, full at the bottom) next to the negative posts; unknown (counted at half) only when the district has fewer than five venues to compare |
| Reachable | 10 % | A phone, a website or an own account |
| Press | 5 % | A feature counts 1, a listicle 0.75, a passing mention 0.25 |
| New place bonus | +5 | Opened within six months and under 300 Google reviews: seen opening by the city list (from January 2027), or a post saying it had just opened |

A name on the city's chain deny list keeps half its score. 60+ is a suggested prospect. Scored on the 2nd of each month.

## Reports (`/admin/reports`, `/admin/reports/<id>`)

**Report templates** (`/admin/reports/templates`): ready-made layouts a brand's configuration starts from, with a live preview on a built report; the default one, how many brands have a copy, and every report made from each. The report as the owner sees it, the PDF, **Share** (a private link `/r/<token>`: anyone with it reads the report without login; opens are counted from the browser, admins excluded; revoke replaces it; the share is logged as a touch when the brand is a prospect), **E-mail** (send now to a won prospect's address), **Rebuild**.

## Social (`/admin/posts`)

Every post with the brands it names and its creator; **Creators** (the city's month by person); **Own accounts** (venues' own handles with followers and the month's posts); **To review** (the matcher's "this account looks like a venue's own" suggestions: confirm or reject; a confirmed own account is removed from every word-of-mouth count at once).

A **creator's page** shows their accounts, six months of posts, the brands they named, what found their posts (a city hashtag or search, a blog, a search for a venue, their own profile) and **Watched**: for each profile, why we scrape it every week, or that we don't. The ties are "Berlin's discovery" (the city follows them: a creator source on the city's Sources tab, with a switch to stop), or a brand's own-account tracking because the brand is a paying customer, one of the month's most talked-about brands, or a rival a report compares with. "Watch in <city>" adds an unwatched creator to the city's sources.

## Trends (`/admin/trends`)

Topics (every kind of food with a signal: venues, posts, searches, ranked by posts; a topic's own page adds how many delivery menus sell it and at what median price, which lean to report venues and their competitors since only their menus are read), what posts talked about (cuisines, dishes, rising brands, districts, creators), searches (Google Trends with related queries), openings and closures, unrecognised food words (map them to a topic so the next read counts them).

## Cities (`/admin/cities`)

The city row: sources (hashtags and searches with their yield over three months: posts found, matched, how many of the matched ones only that source found (what dropping it would lose), views; "Suggest sources" from the LLM, and "Hashtags from the data": tags we don't scrape that keep showing up on posts about 3+ brands, free), districts and postal codes ("Suggest from venues"), the calendar (weather, holidays, events), budgets per step, the chain deny list, the OSM boundary id.

## Data (`/admin/data`)

**Months**: a month × step grid; a cell queues that step; "Finish" queues the free steps and skips paid ones that already succeeded. **Runs**: start any step with a budget, "Fill competitors", the runs table with each step's figures. **Apify costs**: every actor run with its cost and plan-limit notes.

## What a salesperson should know

- **Consent**: cold e-mail to a German business needs prior consent (UWG §7); the call and visit scripts ask "May I e-mail it?", logging the yes keeps the composer from warning, and every first e-mail offers a way out. Opted-out is permanent.
- **Visits are the channel**: take the leave-behind, log the visit with who you reached, whether they said we may e-mail them and when to come back; the come-back time becomes the follow-up, and Today lists it when due.
- **The sample is the pitch**: send the brand's own report (share link or PDF). The four venues at the top of PROSPECTS.md already have full review analysis; others need their reviews scraped first (~$0.10–0.30 each).
- **Numbers are a month's, never all-time**, and a blank is "not measured". Don't quote month-over-month counts as growth without saying what changed in the collection.
- **Chains**: one prospect per brand whatever the cities; a won chain gets a report per city (or one across cities), each mailed by itself.
- **Won means paying**: the pipeline then scrapes and reports the brand every month whatever its buzz, watches its reviews weekly, and mails the report automatically.
