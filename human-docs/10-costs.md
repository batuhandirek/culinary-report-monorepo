# What a city costs

Two cost lines: Apify (scraping, in dollars, capped per run) and OpenAI (the LLM, on complimentary daily allowances today). Everything else (Postgres, the server, Open-Meteo, Nager.Date, OSM, blog feeds) is free or flat.

## Apify: the caps per step (defaults, one city)

A cap is a ceiling, not a spend; a run stops when it reaches it. Actual runs come in under the cap when the sources run dry.

| Cadence | Step | Cap | Per month (ceiling) |
|---|---|---|---|
| Monthly run | Scrape TikTok (month-end pass) | $7 | 7 |
| | Scrape Instagram (posts + reels) | $8 | 8 |
| | Look up venues | $6 | 6 |
| | Scrape venue posts (TikTok search + Instagram places) | $8 | 8 |
| | Scrape reviews (incl. TripAdvisor tenth; up to 40 % of the rest backfills six months for venues new to the set) | $12 | 12 (~$4 the month's own, up to ~$4 backfill) |
| | Refresh venue details | $2 | 2 |
| | Scrape delivery | $7 | 7 |
| | Scrape watched accounts (creators the city follows, report brands' and rivals' own accounts) | $4 | 4 (~$2 spent) |
| | Scrape comments | $13 | 13 |
| | Scrape press | $3 | 3 |
| | Track search ranks (every branch of a report brand) | $4 | 4 |
| | Google Trends | $2 | 2 |
| | **Monthly run total** | | **76** |
| Daily | Instagram recent posts | $2 | ~60 ceiling, ~45 at today's ~$1.50/day |
| Weekly | TikTok, this week (searches + short hashtag pages) | $6 | ~26 ceiling, ~10 at ~$2.30/week (the search's $4 cap is the actor's floor; it spends ~$0.60) |
| Weekly | Instagram reels | $1 | ~4 ceiling, ~0.50 at ~$0.11/week |
| Weekly | Watched accounts, the week's posts (TikTok pays only for the week's videos) | $2 | ~9 ceiling, ~2 at ~$0.50/week |
| Weekly | Own accounts on the other platform (~$0.003 an Instagram profile, ~$0.004 a TikTok one; each account looked up once) | $1 | ~4 ceiling; spends only on brands new to an account once the backlog is through |
| Twice weekly | Busyness samples | $1 | ~9 (paying for nothing today) |
| Twice weekly | Rating snapshots (venues posted about in 30 days + every venue with 500+ reviews; one Google review a venue, not kept) | $3 | ~26 ceiling, ~16 at ~$1.90 a run (Berlin, ~3,300 venues) |
| Weekly | Open tables | $1 | ~4 (Google's page is free; TheFork/OpenTable paid) |
| Weekly | Review watch | $1 | ~4 (only with subscribers) |
| Monthly | OSM lookups | $10 | 10 (~2,000 places; drops to cents once caught up) |
| Quarterly | City-wide Google list + brand branch search | $20 + $2 | ~7 amortised |
| Quarterly, by hand | Food trends page: Google Trends compared five kinds of food at a time | ~$1.30 (28 runs at $0.10 cap) | ~0.45 amortised |
| | **Everything, ceiling** | | **~$239** |
| | **Realistic, after the first months** | | **$120–150** |

For reference: October's actual spend on dev is $43 over 121 runs, with most monthly steps not yet run for October.

Unit prices worth knowing: a Google Maps place ~$0.004 from a search, $0.006 looked up by its id (the detail page is always billed); an Instagram post $0.0027; an Instagram profile with its twelve latest posts ~$0.0026; a TikTok profile video ~$0.003; a TikTok comment $0.00125; a Google review $0.0006; a TripAdvisor review $0.0004; a Google Trends term ~$0.004 (compared five at a time for the food trends page: $0.009 each); a TheFork venue ~$0.006; an OpenTable date ~$0.26; a Wolt menu a few cents. Some actors refuse small caps: the TikTok search needs $4 a run, the Lieferando listing $5, Google Trends $1.

## What the Apify plan limits

The account is on the **Free plan and stays there** (a standing decision). What that means:

- Monthly usage limit raised to **$250**. One city at full default budgets fits; two cities would need trimmed budgets (drop comments to $5, Instagram daily to $1, delivery and busyness to 0 while they return nothing) to fit.
- 5 concurrent actor jobs and 16 GB memory across them; fan-out steps run four at a time and wait when refused.
- Some actors cap Free users at 10 items a run or one page a hashtag; the pipeline uses actors checked to return more, and records a "Free-plan limit" note on runs that were cut.

## OpenAI: the LLM

Two models, keys from several accounts rotated; each account has a complimentary daily allowance per model (10M tokens on the mini model, 1M on the full model). An account that runs out is skipped for 24 hours; when every account is out, the step fails and the run stops (nothing paid for afterwards). September's run failed this way once.

| Model | Used for | Volume |
|---|---|---|
| gpt-5.4-mini | Extracting mentions (~1,400 tokens a post; a blog article up to ~4,000 more, Berlin's blogs ~70 articles a month), analysing reviews (batches of 10), deciding close matches, classifying comments (80 a call) and press | Thousands of calls a month per city |
| gpt-5.4 | Report highlights and reply drafts (one call each per report), pitch hooks, source suggestions, the front page's lines (one call of ~8k tokens every five days) | ~25–45 calls a month per city |

At today's volumes a city stays inside the allowances; a second city or a wider review funnel would be the first thing to push past them, at which point the LLM becomes a paid line; size it from the token counts the LLM calls log before deciding, not from a guess.

## Cost of the fixes proposed in the completeness doc

| Fix | Monthly cost |
|---|---|
| Extract and match after every recurring scrape (done) | $0 (LLM allowance) |
| Auto-fill competitors in the run (done) | $0 |
| Review backfill for new report brands (done) | up to ~$4: ~$0.20 a new venue (seven months of ~47 reviews), capped at 40 % of the review step's Google budget |
| Retry stale name lookups (done) | cents |
| Opening flag in extraction, rating benchmark, Impressum scrape (parked) | $0 |
| One-off OSM lookup catch-up | ~$45 once |
| Weekly TikTok listening (done) | ~$14 (was $15): ~$10 weekly + ~$3.60 at month end |
| Name search for the top 40 instead of 20 | ~$2 |
| Review sample for the top 100 brands by buzz | ~$5–10 (to be measured on one run) |
| Creators a city follows, report brands' and rivals' own accounts, scraped weekly (done) | ~$4 with the month-end pass |
