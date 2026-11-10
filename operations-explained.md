# Operations, in plain English

All times are UTC. Everything runs for every city whose cron is on. When an operation needs another one's work, it starts that one itself and waits for it. Each city's run of an operation for a given month, week or day happens only once, however many operations ask for it. Nothing here builds reports: those are built by hand from the brand page.

## Every hour

- **every :00**: we check each city's local clock. At 19:00 on Thursdays and Saturdays we sample how busy the report venues and their competitors are (Google popular times). At 19:00 on Thursdays we also check which venues with a booking page are booked out for the coming Friday and Saturday evening.
- **every :10**: we read the posts nobody has read yet, one post at a time, most viewed first (up to 1,000 per city).
  - The gate first decides whether the post is about eating or drinking out in the city.
  - If it is, agent A writes down the places it names and what it says about them.
  - Then each claim gets its sentiment, aspect and kind, and each mention its food topics.
  - Last, the post's places are matched to venues: the sure ones at once, and each close call is queued on its own to ask the matching agent, so one waiting for the day's allowance holds nothing else up.
- **every :20**: we read the written reviews nobody has read yet, one review at a time, newest first (up to 1,000 per city). Agent A writes down each review's claims, then each claim is labelled.
- **every :30**: we read the TikTok comments nobody has read yet, one post's comments at a time. Each comment gets its intent (a question and its topic, a disagreement, praise…). When comments disagree with the post, we write one line on what they say.
- **every :50**: we classify the press pages nobody has classified yet, one page at a time: a feature, a list, a passing mention, or unrelated.

## Every day

- **04:00**: we scrape each Instagram hashtag's newest page of posts (the last two days are kept).
- **04:20**: we scrape the creators we watch: the creators each city follows and the ones who keep posting about its places.
  - TikTok profiles are scraped every day, paying only for videos since the last run.
  - An Instagram profile is scraped when it hasn't been for three days.
- **05:15**: for each city whose last dish-search snapshot is old enough (`dishSearchEveryDays`), we search Google Maps for every dish and cuisine in every district and store the top ten of each.
- **05:30**: we read the views, likes and comments of every post that has just turned seven days old, so all posts are compared at the same age.
- **05:40**: the matching sweep. Everything still unmatched gets another go: names that found no venue (once the city has new venues), brand changes, places from the night's re-read. Close calls go to the matching agent, then we relink which brand each hashtag names, link accounts to the brands they belong to, and place mentions by the accounts their posts tag. The lookups, competitors and lead scores run this sweep first, so they always see everything matched.
- **05:45**: we fetch the follower count of every brand account that doesn't have one yet.
- **22:00**: we re-read up to 200 posts that were read before the current way of reading posts, most viewed first.
- **22:00**: the LLM backlogs run with whatever is left of the day's free allowance. Among them is the re-read of reviews that were read the old way.

## Every week

- **Sunday 03:00**: we listen to the week.
  - TikTok: we search the city's searches and hashtag words over the last week.
  - Instagram: we scrape each hashtag's top reels of the week.
  - Blogs: we read the city's food blogs' new articles.
  - Brand accounts: we scrape every brand's own accounts, keeping their posts of the last two weeks.
  - TikTok by name: we search the names of last month's report brands, their competitors and the open prospects over the week.
- **Sunday, after those scrapes**: we make an account of every Instagram handle the week's posts tag.
  - We read the profiles we've never read and match the accounts by what their bios say.
  - We search Google Maps for business profiles whose address names none of our places.
  - We ask the agent which place at an address a profile is (only a suggestion).
  - Then we place mentions by the tags.
- **Sunday, after that**: we look up on Google Maps the places the week's posts named that we couldn't match, then match again. A place posts mention is on the map within a week.
- **Sunday, after the lookups**: for brands missing an Instagram or TikTok account, we look up their handle on the other platform and link it when the profile proves it's theirs.
- **Monday 05:00**: for paying customers only, we scrape the last ten days of reviews and read them. We send an alert for each new review of 3 stars or fewer that hasn't been answered.
- **Tuesday 04:30**: we fetch every open venue's new Google reviews and its current rating (venues posts talked about first).
- **Wednesday 04:45**: we re-read the follower counts of every brand account and every big creator, each one every two weeks.

## Every month (the 2nd, 06:00, for the month that just ended)

Everything below starts at the same moment; each one waits for what it needs.

- If a quarter has passed since the last time, we scrape the city's whole restaurant, bar and café list on Google Maps, then search every chain's name for branches that opened since.
- For a city with an OpenStreetMap boundary, after the venue list:
  - We link every food place OpenStreetMap knows to the venue it is.
  - We search Google Maps once for each one we don't have.
- We search TikTok over the whole month for what the weekly searches missed.
- We scrape the month's Instagram hashtag posts and reels.
- We read the blogs once more.
- Once the venue lists and the month's posts are in and read, we look up the names posts gave that we couldn't match, then match again.
- Once the month's lookups are done, so the month's most talked-about brands are known:
  - We search TikTok and Instagram by each report brand's name.
  - We scrape the report brands' and their rivals' own accounts: posts since the month began, and their follower figures that close the month.
- Once those posts are read and matched, so the report brands are final, every report brand without competitors gets its five best suggestions.
- Once the competitors are picked, these run:
  - We scrape the month's Google and TripAdvisor reviews of every report branch and competitor. A venue new to the set gets six months back.
  - We refresh their Google Maps details (hours, amenities, popular times, delivery links).
  - We scrape the comments under each report brand's five most viewed TikTok posts.
  - We search Google News and Google for each report brand's press.
- Once the details are refreshed, we scrape the report venues' and competitors' Wolt and Lieferando listings and menus.
- We pull Google search interest for every food topic and every paying customer's name.
- Once the month's reviews and press are scraped and read, we score every brand's sales lead score.

## Only when an admin asks

- **Backfill reviews** (`POST /admin/backfill-reviews`): we fetch the reviews since a given day of every venue posts talked about lately that has none stored from then, within a budget.
- **Re-flag openings** (`POST /admin/mentions/reflag-openings`): we re-read a month's posts only to decide again which places they call new.
- **Find branches** (brand page): we search Google Maps for the brand's name in the city, keep every place it returns, and join the ones on the brand's own website to it; the page shows them when the search is done (about half a minute).
- **Build report** (brand page): we build the brand's report for a month. No schedule ever does this.
- **Trigger a schedule** (`/admin/workflows` → Schedules): any of the above, now, for every city.
- **Resume a failed run** (`/admin/workflows`): it goes on from where it failed. Nothing is paid again for the steps already done.
