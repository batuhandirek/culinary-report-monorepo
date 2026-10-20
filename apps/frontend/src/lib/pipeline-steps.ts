import { AdminStartPipelineRunInputDtoStepEnum as Step } from 'client';

// The pipeline steps' names and what each does, in the order the monthly run takes them: the
// Data page's grid and its run form.
export const PIPELINE_STEPS: { value: Step; label: string; note: string; budget?: number; top?: boolean }[] = [
	{ value: Step.MONTHLY, label: 'Monthly run', note: "Every step below but the venue list, in order, on the city's budgets." },
	{ value: Step.SCRAPE_VENUES, label: 'Scrape venues', note: "Google Maps: restaurants, bars and cafés in the city. Not part of the monthly run: the cron queues it a quarter after the last one. Places it finds for the first time with few reviews count as openings, except on the city's first scrape.", budget: 20 },
	{ value: Step.SEARCH_BRANCHES, label: 'Search brand branches', note: "Not part of the monthly run: every confirmed brand with a branch in the city, searched by name on Google Maps (forty places a brand), so branches opened since show up on the brand's page to add. The cron queues it after each quarterly venue scrape.", budget: 2 },
	{ value: Step.SCRAPE_TIKTOK, label: 'Scrape TikTok', note: "The city's enabled TikTok hashtags and searches, from the month on. Searches get 40 % of the budget and need at least $4.", budget: 15 },
	{ value: Step.SCRAPE_INSTAGRAM, label: 'Scrape Instagram', note: "The city's enabled Instagram hashtags: posts and top reels, from the month on. On Apify's Free plan a hashtag gives one page of posts a run, so the daily run below collects the month.", budget: 8 },
	{ value: Step.SCRAPE_INSTAGRAM_RECENT, label: 'Instagram, recent posts', note: "Not part of the monthly run: the newest page of each of the city's Instagram hashtags (about a day of posts on a busy tag), kept two days back whatever the month. The cron runs it daily at 04:00 UTC.", budget: 2 },
	{ value: Step.EXTRACT_MENTIONS, label: 'Extract mentions', note: 'LLM: which venues each new post talks about.' },
	{ value: Step.MATCH_MENTIONS, label: 'Match mentions', note: 'Link mentions to venues (LLM for close calls), then post authors to the brands they are the own accounts of.' },
	{ value: Step.LOOKUP_VENUES, label: 'Look up venues', note: 'Search Google Maps for names nothing matched.', budget: 6 },
	{ value: Step.SCRAPE_VENUE_SOCIAL, label: 'Scrape venue posts', note: "TikTok search and Instagram place posts of the report brands, half the budget each. The TikTok search needs at least $4.", budget: 8, top: true },
	{ value: Step.SCRAPE_REVIEWS, label: 'Scrape reviews', note: "Google reviews of the report brands' branches and their competitors from the month's first day on (later months' are kept too); a tenth of the budget finds their TripAdvisor pages (once) and scrapes the month there.", budget: 5, top: true },
	{ value: Step.ANALYSE_REVIEWS, label: 'Analyse reviews', note: 'LLM: topics, dishes and changes guests noticed.' },
	{ value: Step.REFRESH_VENUE_DETAILS, label: 'Refresh venue details', note: 'Google Maps detail pages of the report brands and their competitors: hours, amenities, popular times, "people also search".', budget: 2, top: true },
	{ value: Step.SCRAPE_DELIVERY, label: 'Scrape delivery', note: "Wolt menus (from Google's \"Order online\" links) of the report brands and their competitors, Lieferando ratings and fees from the city's listing for the rest (its actor needs a $5 cap).", budget: 7, top: true },
	{ value: Step.SAMPLE_BUSYNESS, label: 'Sample busyness', note: "Not part of the monthly run: Google popular times of the month's report brands and their competitors, now. The cron runs it Thursdays and Saturdays at 19:00 city time.", budget: 1, top: true },
	{ value: Step.SAMPLE_RESERVATIONS, label: 'Sample open tables', note: 'Not part of the monthly run: open Friday and Saturday evening tables on TheFork / OpenTable for won prospects whose Google booking link or website is on one. The cron runs it Thursdays at 19:00 city time.', budget: 1 },
	{ value: Step.SEARCH_INTEREST, label: 'Google Trends', note: "Google search interest over twelve months in the city's region: its 30 most mentioned cuisines and the won prospects' names.", budget: 1 },
	{ value: Step.TRACK_SEARCH_RANKS, label: 'Track search ranks', note: 'Google Maps searches a guest would type for each report brand ("ramen Mitte": its kinds of food × its district, three at most): its rank and the top ten.', budget: 3, top: true },
	{ value: Step.SCRAPE_OWN_ACCOUNTS, label: 'Scrape own accounts', note: "The report brands' own TikTok and Instagram accounts (matched by handle or website, from outreach, or added on the brand page): followers, posts, views per post.", budget: 2, top: true },
	{ value: Step.SCRAPE_COMMENTS, label: 'Scrape comments', note: "Up to 100 top-level comments under each report brand's five most viewed TikTok posts by others; a post is scraped once.", budget: 13, top: true },
	{ value: Step.ANALYSE_COMMENTS, label: 'Analyse comments', note: 'LLM: who wants to go, who disagrees, what they ask, per post.' },
	{ value: Step.SCRAPE_PRESS, label: 'Scrape press', note: "Google News and web search for each report brand's name in the city, limited to the month, then an LLM sorts features, lists and namesakes.", budget: 3, top: true },
	{ value: Step.BUILD_REPORTS, label: 'Build reports', note: 'A report for each report brand (the most talked about, plus every customer).', top: true },
	{ value: Step.SCORE_LEADS, label: 'Score leads', note: 'Lead score of every brand, from the month and the one before. Free.' },
	{ value: Step.WATCH_REVIEWS, label: 'Watch reviews', note: "Not part of the monthly run: the city's subscribers' Google reviews of the last ten days (the month is ignored), with an e-mail per new review of 3 stars or fewer. The cron runs it every Monday.", budget: 1 }
];

export const stepLabel = (step: string) => PIPELINE_STEPS.find((s) => s.value === step)?.label ?? step;
