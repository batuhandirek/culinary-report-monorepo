# Culinary Report: the human docs

Plain-language documentation of the product for people who plan, sell or price it, not for people who change the code. Everything here is derived from the code and the Berlin development database as of **21 October 2026**. Nothing is released yet: there is no production system, no paying customer and no sent report. Numbers quoted from "the dev database" describe what the pipeline has gathered for Berlin so far, and they will move.

The technical counterpart of this folder is `.claude/skills/` (one file per domain, written for engineers and for Claude). When the two disagree, the skill is right and this folder needs an update.

## Read in this order

| # | File | What it answers |
|---|---|---|
| 1 | [01-product-overview.md](01-product-overview.md) | What we sell, to whom, what the customer gets, how a sale happens |
| 2 | [02-data-sources.md](02-data-sources.md) | Every source we fetch from: what, where, when, cost, limits, and what it feeds |
| 3 | [03-timeline-and-triggers.md](03-timeline-and-triggers.md) | The calendar (hourly, daily, weekly, monthly, quarterly) and the event graph: what triggers what |
| 4 | [04-report-contents.md](04-report-contents.md) | The monthly report section by section: the question each answers, the data behind it, when it is missing |
| 5 | [05-questions-venues-ask.md](05-questions-venues-ask.md) | The questions an owner has, which we answer, which we don't, and what data would answer the rest |
| 6 | [06-data-completeness.md](06-data-completeness.md) | Where coverage is thin, which fetch sequences are wrong, and the fixes (with ticket slugs) |
| 7 | [07-ideas-report-types-and-features.md](07-ideas-report-types-and-features.md) | Brainstorm: other report types, other buyers, portal and panel features |
| 8 | [08-admin-and-sales-tools.md](08-admin-and-sales-tools.md) | What the admin panel gives a salesperson today: the lead score, the sales tab, templates, share links |
| 9 | [09-state-of-the-data.md](09-state-of-the-data.md) | What the dev database holds today, in numbers |
| 10 | [10-costs.md](10-costs.md) | What a city costs per month on Apify and the LLM, and what caps the plan |
| 11 | [11-glossary.md](11-glossary.md) | The words: brand, branch, mention, source, report month, lead score, … |
| 12 | [12-open-decisions.md](12-open-decisions.md) | Decisions only the business can take, with the assumption the code runs on today |
| 13 | [13-public-reports-and-marketing-content.md](13-public-reports-and-marketing-content.md) | Public reports and marketing content: top hits, trends, openings, Instagram, blog, gated PDF |
| 14 | [14-business-brief.md](14-business-brief.md) | What it does in bullets, value propositions, pain points by function, churn prevention, B2B services and trends, market research |

## Conventions

- **A "brand" is the customer, a "branch" is an address.** A one-location restaurant is a brand with one branch. See the glossary.
- **Money is in US dollars**, Apify's currency. LLM calls today run on complimentary daily allowances, so they cost nothing until those run out.
- **"Absent" is not "zero".** Throughout the product a missing figure means "not measured", and the report hides the section rather than showing a 0. This matters when reading coverage numbers.
- Ticket references are slugs in `tasks/todo/` (for example `continuous-listening`). The tickets this documentation pass created are listed at the end of [06-data-completeness.md](06-data-completeness.md).
