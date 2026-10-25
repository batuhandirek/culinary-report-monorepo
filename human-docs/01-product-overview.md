# The product in one page

## What it is

Munchwerk sends the owner of a restaurant, bar or café a **monthly report on what the internet says about their business**, and gives them a **portal** to work with that data between reports. The data comes from TikTok and Instagram posts by other people, food blogs and city magazines, Google and TripAdvisor reviews, Google Maps (details, popular times, search results), press, delivery apps, booking pages, Google Trends and the city's weather and holidays. The report is written for the owner: three findings, two or three things to do next month, and the numbers behind them.

Today it is built for **Berlin**. Any city is a row in the admin panel (name, hashtags, search queries, districts, budgets); nothing about Berlin is hard-coded.

## Who buys it

The person who decides at one business: an independent owner, or the manager of a small chain. The product is keyed to the **brand** (the business), which has one or more **branches** (addresses). A chain gets one report per city with a branch-by-branch comparison inside it; a brand present in several cities can get one report per city or one across all of them.

Big chains and institutions are deliberately left out of the sales list by a per-city deny list: they have agencies and don't need us.

## What the customer gets

1. **The monthly report** (a private web link and a PDF), built on the 2nd of each month for the month that ended. Contents in [04-report-contents.md](04-report-contents.md). The pitch is a free sample of their own report, because a real finding about their own place sells better than a demo.
2. **The portal** (`/portal`): the report and every earlier month; a review explorer with a "needs a reply" queue and ready-to-post reply drafts; the posts and creators who talked about them; six months of trends against their competitors; a "patterns" page (what followed what, week by week); competitor picks; contact settings.
3. **A weekly alert e-mail** when a critical review (3 stars or fewer, unanswered) arrives, with a reply draft in the review's language.
4. **A competitor comparison** in every report: up to five competitors, picked by us (suggested from shared food, district and Google's "people also search for") or by the owner in the portal.

## How a sale happens today

Everything is by hand, from the admin panel ([08-admin-and-sales-tools.md](08-admin-and-sales-tools.md)):

1. Each month's run scores every brand in the city (0–100) on buzz, whether they already spend on social, a nameable problem in their reviews (else a Google rating below their district's), reachability and press. Brands at 60+ are the suggested prospects.
2. The salesperson adds a brand to the sales list; the app writes a one-sentence pitch hook from its report.
3. First contact is a call, a DM or an e-mail from the salesperson's own mailbox, from templates the app fills in (venue, month, creators, views, hook). German law needs consent before a cold e-mail to a business, so the call script asks "Can I e-mail it?". The app logs every touch, moves the stage and schedules the follow-ups (4 days, then 7).
4. A won brand becomes a subscriber: its report is built every month whatever its buzz, mailed automatically with a private link, and its reviews are watched weekly. The owner gets a portal login.

## What is true today (21 October 2026)

- Berlin only, in a development database: 4,991 venues, 4,716 brands, 21 reports for September 2026, 21 prospects on the sales list (none contacted yet), no report sent, no paying customer.
- The pipeline runs end to end, but September's reports were built while sections were still being added, and several paid steps failed or never ran that month (busyness, press classification, comment analysis, Wolt menus). [09-state-of-the-data.md](09-state-of-the-data.md) has the detail.
- The Apify account is on the Free plan and stays there (a standing decision), with the monthly usage limit at $250. That caps what one city can collect per month ([10-costs.md](10-costs.md)).
- Reports are in English; the decision on German reports is open (`report-language` ticket). Outreach templates exist in English and German.
- Pricing is not decided anywhere in the code or the docs.

For the longer brief (value propositions, pain points by function, churn, B2B services, market research), see [14-business-brief.md](14-business-brief.md).
