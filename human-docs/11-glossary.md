# Glossary

**Brand** — the business we sell to and report on: a name with one or more branches. Reports, prospects, portal access, lead scores, competitor lists and own accounts belong to the brand. A one-location café is a brand with one branch.

**Branch** — one address of a brand: a Google Maps place. Google data, reviews, rating history, busyness, open tables, delivery listings, search ranks and openings/closures belong to the branch. "Venue" in the code means branch.

**Chain** — a brand with two or more branches. Chains are made only by merging (automatic when the branches share a website named after the brand; otherwise an admin confirms a suggestion).

**City** — one place the pipeline covers; a row in the admin with its hashtags, searches, districts, budgets, time zone and deny list. Berlin is the only one today.

**Source** — a hashtag or search query the city listens to, per platform. Each post remembers the source that found it first, so a source's yield can be read.

**Post** — one TikTok video or Instagram post or reel, stored once whichever source found it. A post by a brand's own account is an "own post".

**Mention** — one venue a post talks about, as the LLM extracted it (name, location hint, cuisine, sentiment, summary, dishes, praise, complaints), and the venue or brand it was matched to. One post can hold several mentions.

**Matched / unmatched / other city** — a mention linked to a venue or brand (exactly, fuzzily, by the LLM, or by an admin) / one nothing matched (retried when venues are added) / one the post places in another city (never retried).

**Posts by others** — posts whose account is not the brand's. Every count that means "word of mouth" uses these only.

**Report month** — the calendar month a report covers; built on the 2nd of the following month.

**Report brands** — the month's top 20 brands by posts from others, plus every subscriber (won prospect). The paid per-venue steps run for these and their competitors.

**Competitor** — a place or a whole rival brand on a brand's list (five at most per subject), picked by an admin, by the owner in the portal, or filled from suggestions. A competitor's reviews are scraped with the brand's, so the comparison can use percentages.

**Own account** — a brand's own TikTok or Instagram handle: linked by an admin, found as the branch's Google website, linked from the brand's own website, given by outreach, matched by name from the handle (creators tagging it under posts about the brand count as evidence), or the brand's handle on its other platform when that profile names the brand's website or a branch's street (anything less sure is confirmed or rejected on the Social page). Its posts never count as word of mouth.

**Watched profile** — a TikTok or Instagram profile we scrape every Sunday and at month end, its latest posts stored like any post: a creator a city follows (a creator source), or the own account of a report brand (customer or most talked about) or of a report brand's competitor.

**Creator** — the person behind one or more accounts (one person's TikTok and Instagram count once).

**Food topic** — one kind of food in our vocabulary (cuisine, dish, drink, diet, format, meal), with aliases and a Google Trends id. Mentions' cuisines, venues' Google categories, delivery menu items and Google's review tags are linked to topics when they are stored, and every venue keeps its topics as tags, so "all burger places in Berlin" is a lookup. A new alias or topic re-links everything in the background within minutes, without the LLM.

**Feedback theme** — what one praise or complaint point is about, from a fixed list of about 60 under the nine feedback topics (food, drinks, service, atmosphere, price, payment, wait, cleanliness, other): "price increase", "portion size", "cash only", "friendliness". It lets "prices went up" and "the dürüm is now €9.50" count as the same thing, in one venue's report and across a city. A theme never says good or bad; whether the point was praise or a complaint does.

**Primary topic** — the one kind of food a venue is known for (admin tag, else Google category, else what posts say, else its delivery menu, else Google's review tags).

**Lead score** — 0–100 per brand, scored monthly: buzz, already spends, nameable problem, reachable, press, plus a new-place bonus; halved on the deny list. 60+ is a suggested prospect.

**Prospect** — a brand on the sales list, with a stage: to contact, contacted, replied, won, lost, opted out. One per brand.

**Won / subscriber** — a paying brand: reported every month whatever its rank, mailed automatically, reviews watched weekly, portal access.

**Touch** — one logged contact (e-mail, DM, call, visit, reply, note, stage move) with the template it came from.

**Hook** — the one-sentence pitch line the app writes from the brand's report for the templates.

**Share link** — a private URL to one report that needs no login; opens are counted; revocable. Every report e-mail and every link put into a sales message gets one of its own, so the brand's Sales tab shows whether that message's link was opened.

**Step / run** — one unit of pipeline work for a city and month (e.g. "Scrape reviews, Berlin, 2026-09"), with a budget, a status and its figures. The monthly run is 21 steps in order.

**Budget / cap** — the most a step may spend on Apify, enforced by Apify; per step, overridable per city and per run.

**Free-plan limit** — a note on an Apify run that an actor cut short for Free users (10 items, one page).

**Rating snapshot** — a venue's all-time Google rating and review count on a given day, written by every scrape that sees it, and twice a week for every venue posted about in the last 30 days or with 500+ reviews; the report's sparkline.

**Status change** — opened / temporarily closed / permanently closed / reopened, recorded when a scrape sees the change; "opened" only from a city-wide list after the first one. A post saying a place has just opened also counts it as opened (source "posts") without recording a status change.

**OSM place** — a food or drink place OpenStreetMap lists in the city; our checklist of what Google's capped list may have missed. Never shown anywhere.

**Booked out** — the share of 15-minute slots between 18:00 and 22:00 that are closed on a booking page for a table of two, sampled Thursdays for the coming Friday and Saturday.

**Busyness index** — the mean of Google's ten busiest hours in a venue's popular-times histogram (0–100, scaled to the venue's own peak: comparable over time, never between venues). Empty today.

**City section** — the report's "What \<city\> is talking about": rising cuisines and dishes, the venue's rank for its kind of food, and its figures against the median of the month's report brands. Needs 200 matched mentions in the month.

**Patterns / correlations** — "what followed what": buzz → reviews, complaint times, paid vs organic; floors of 10 reviews and 3 posts; never "caused".

**Finish the month** — rerun a month's run, skipping paid steps that already succeeded.

**Rebuild** — recompute a report's data and rewrite its highlights (after corrections or new data). Mails nobody.
