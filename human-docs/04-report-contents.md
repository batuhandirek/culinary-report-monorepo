# What is in the monthly report

One report = one brand × one city × one month. It is a web page (private link, no login) and an A4 PDF printed from the same page. The data is computed once when the report is built; rebuilding replaces it. The written parts (cover title, headline, three findings, two or three actions, reply drafts) are written by the LLM (gpt-5.4) from the numbers only; it is told to quote figures as given, attribute each point to its source, and never compute or estimate.

A chain's report covers all its branches: posts, reviews, dishes, creators, competitors, own accounts, comments, press and "what followed what" are the brand's; the place sections (popular times and tables, prices, who got talked about nearby and the openings, Google Maps searches, the rating and Google details) come once per branch, one branch after another, each about that address only (they are never added up or averaged across branches). A single place gets them once, its facts on the cover.

A rule that shapes every section: **a section that has no data is left out, never shown as zero.** "Not scraped" and "none" are different things, and the report only ever says the first by omission.

## Sections, roughly in page order

| Section | The owner's question | What it shows | Data behind it | Missing when |
|---|---|---|---|---|
| **Cover** | What was the month's one story? | A title (≤ 8 words), a headline (≤ 35 words), the place's facts: category, district, street, all-time Google rating and review count, where that rating stands among the district's food venues and the city's venues of its kind of food (percentile, venues with 20+ reviews; for a chain in each place's header), what Google says it offers (outdoor seating, delivery, …), the all-time star distribution, a six-month rating sparkline | Google Maps list + detail pages; rating snapshots from each review scrape | Amenities and distribution: no detail page yet. Sparkline: fewer than two snapshots |
| **The month in numbers** | Did the month go up or down? | Posts by others, views, interactions, this month's average stars, reply rate, each with the change on the month before | Posts + reviews of this month and the one before | Deltas: no previous month with posts or reviews (first report) |
| **Three findings** | What matters? | Three points with the evidence and the source; one compares with competitors when there are any; one compares branches for a chain; one may place the month in the city | Everything below, pre-summarised for the LLM | Never (always written) |
| **What decides the stars** | Why do guests give 4 instead of 5? | What 5-star reviews praise next to what reviews below 5 criticise, as "19 of 34 written reviews" bars, with sample quotes | This month's Google (+ TripAdvisor) reviews, LLM topics | Fewer than 3 written reviews on either side |
| **Branch by branch** (chains) | Which location is the problem? | Each branch's posts, views, reviews, stars, reply rate, praise and complaint shares side by side; posts that named the brand but no branch counted apart | Every branch's mentions and reviews | One-branch brand |
| **How you compare** | Am I ahead of the places I compete with? | Up to five competitors: reach (posts, views, creators), reviews, stars, reply rate, praise and complaint matrices on percentages; weekend tables and foot-traffic change columns when sampled | The same scrapes for each competitor | No competitor on the list (17 of 21 September reports had some). A competitor's reviews show "—" when we don't track them |
| **What to do next** | What do I do about it? | Two or three concrete actions, each following from a finding; last month's actions are followed up when there was a last month | LLM over the findings | Never |
| **What people posted** | Who talked about me and what did they say? | Sentiment split, topics praised and criticised across posts, the posts list (platform, creator, views, visited or not, paid or gifted, one-line summary, dishes) | TikTok + Instagram posts by others, LLM extraction | No post this month (the section is empty, the report still builds) |
| **The people behind the posts** | Which creators matter, and whom should I invite? | Top eight creators by views (followers, posts, paid or not, visited); "Worth inviting": up to eight creators who covered neighbours in the district this month but not the venue | Posts + the authors' follower counts (TikTok only; Instagram has none) | Nobody posted; no district |
| **Google reviews** | What came up, how many stars, what changed? | Topic bars, the star histogram, "changes guests noticed" (new owner, prices up), the critical reviews worth reading (≤ 3 stars, excerpt, answered or not) | Reviews + LLM analysis | No review stored this month |
| **Replies ready to post** | How do I answer the bad ones? | Up to ten drafts for unanswered written reviews, lowest stars first, in the review's language | Reviews, gpt-5.4 | No unanswered written review; a failed LLM call leaves it out |
| **On the menu** | Which dishes do people talk about? | Dishes named across posts and reviews, with positive / negative counts, with their Wolt price when a menu exists | LLM-named dishes, grouped accent-insensitively and singular with plural ("burgers" is "burger"); dishes with different names stay apart (dürüm is not döner) | Nothing named |
| **Where guests find you** | Do I show up when someone searches "ramen Mitte"? | Up to three Google Maps searches (food topic × district): the venue's rank, the top ten with ratings, the rank in up to five earlier months | Search rank scrape | No district, or the step didn't run |
| **What \<city\> is talking about** | Am I on the right side of the city's trends? | Rising cuisines and dishes (share in points), the venue's kind of food and its rank among the venues posted about for it, its posts, views, stars and reply rate against the median of the month's report venues (percentile), Google searches vs social share per cuisine | Every matched mention in the city; Google Trends | Fewer than 200 matched mentions in the city that month |
| **Did the buzz fill the place?** | Did the posts bring people in? | Week by week: views, Google busyness index, booked-out share; peak hour; "Weekend tables" tile with the competitors', the district's and the city's median | Popular times samples, booking page samples | **Always, today**: popular times come back empty. Weekend tables need a booking page |
| **What followed what** | Do posts turn into reviews? Do paid posts work? When do complaints come? | Buzz → reviews (the week after the most viewed week vs the usual pace), complaint times (by hour, which topics cluster), paid vs organic (median views, reviews in the seven days after) | Posts and reviews of the month and the six before | Below 10 reviews or 3 posts; no history |
| **Your prices next to theirs** | Am I expensive? | Delivery listings (rating, fee, minimum order), first the place's own kind of food (its primary food topic, "your ramen €14.50, theirs €12.90") against the same on competitors' (else the district's) menus when one of them has it, then the median main course against those menus, the dishes' prices, price complaints vs competitors | Wolt menus, Lieferando listing, reviews | No delivery listing; **menus always, today** (no Wolt links) |
| **Your own accounts** | Is my own posting working? | Followers and change, posts added, average views and likes, how many times more views creators get than the venue's own posts | Profile snapshots, posts by others | No linked account, or no snapshot this month |
| **What viewers said** | What do people ask under the videos? | Per top post: intent / confirmation / disagreement / question / tag shares; the three most asked question topics with an example and, at 5+, an action ("tag your location") | TikTok comments, LLM | No comment scraped |
| **In the press** | Was I written about? | Features, listicles, passing mentions with outlet, title, date, summary | Google News + web search, LLM | Nothing found (or not searched: then unknown, not none) |
| **Locals vs visitors** | Do tourists see me differently? | Google and TripAdvisor side by side; topics whose share differs by 20+ points | Both review platforms | No TripAdvisor page (6 of 4,991 venues have one) |
| **Openings and closures nearby** | What changed around me this quarter? | Opened / closed / reopened in the district and on the venue's street, with names, twelve at most; an opening only a post announced is marked "from a post" | Status changes from the quarterly city list, plus places a creator's post said had just opened (under 300 Google reviews, still open; a place both saw counts once) | No district, or before the city's first city-wide scrape. Until the second one (January 2027) the openings are the posts' only and closures show only when a scrape sees them |
| **The month's context** | Was it the weather? | One clause at most in the findings; the calendar (rainy weekends, holidays, events) | Open-Meteo, Nager.Date, admin events | Below 90 % weather coverage |
| **Sources** (appendix) | Can I check the numbers? | Every review of the month (excerpt, stars, topics, answered), "how we count" | Reviews | Never when reviews exist |

## What the LLM is allowed to say

- Only numbers that are in the data or counted from its lists.
- Topic counts as "19 of 34 written reviews", never "19 complaints".
- Competitor and branch comparisons only on percentages and only where a group has 5+ written reviews.
- "Followed by", never "caused". Weather and holidays in one clause, never as a cause.
- Each point names its source (TikTok, Instagram, Google reviews).
- Paid or gifted posts weigh less.
- A rating move of 0.1 or more gets mentioned.

## What the report deliberately does not contain

- Reviewer names, comment authors, review links (personal data).
- Any Google busyness level compared between venues (Google scales each venue to its own peak; only changes are compared).
- Trend counts: the city section works in shares, because the scrape budget moves the counts.
- Any OSM-derived field.
