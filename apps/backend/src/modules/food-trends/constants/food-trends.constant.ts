// The anchored Google Trends pull behind a city's quarterly food trends page.

// Compares 2–5 terms on one 0–100 scale (`compare: true`), takes a region code as typed and a
// custom range; $0.009 a keyword report on Apify's Free plan, platform usage included.
// `signalbench/google-trends-scraper` (the monthly pull) has no compare mode
export const TRENDS_COMPARE_ACTOR = 'steadyfetch/google-trends-scraper';

// The topic every group carries, so groups can be put on one scale: always searched, steady
// through the year, in every city
export const ANCHOR_TOPIC_KEY = 'pizza';

// Google compares at most five terms: the anchor and four topics
export const COMPARE_GROUP_SIZE = 5;

// Two years ending with the quarter, so the quarter compares with the same quarter a year earlier
// on one scale (a single window rescales every month to its own peak)
export const ANCHORED_WINDOW_MONTHS = 24;

// Per group run: five reports at $0.009; the actor refuses a cap under $0.05
export const COMPARE_GROUP_CAP_USD = 0.1;
export const COMPARE_REPORT_USD = 0.009;

// Runs side by side (Apify Free: five actor jobs at once, leave room for the pipeline)
export const COMPARE_CONCURRENCY = 3;

// A queued or running pull older than this is taken as lost (a restart), so it can be queued again
export const PULL_STALE_MS = 60 * 60 * 1000;

// Levels are against the anchor's two-year mean = 100. A topic under 1 is below what the
// comparison resolves (Google rounds every week to a whole number of the group's peak)
export const MIN_SEARCH_LEVEL = 1;
// A rise is only claimed for a topic searched at least this much, and by at least this much
export const MIN_RISING_LEVEL = 2;
export const MIN_RISE = 0.1;

// A quarter's share of posts needs this many matched mentions with a topic, and a topic this many
export const MIN_QUARTER_MENTIONS = 100;
export const MIN_TOPIC_MENTIONS = 3;

export const FOOD_TRENDS_TOP = 10;
export const FOOD_TRENDS_RISING = 8;
export const FOOD_TRENDS_BREAKOUTS = 12;
export const FOOD_TRENDS_OPENINGS = 10;

// Rising queries about trouble stay off a public page (positive framing): Google's own list can
// hold "closed", a recall or a health inspection
export const NEGATIVE_QUERY_WORDS = [
	'closed',
	'closing',
	'shut',
	'geschlossen',
	'schließt',
	'schliesst',
	'schließung',
	'schliessung',
	'insolvenz',
	'insolvent',
	'pleite',
	'konkurs',
	'hygiene',
	'lebensmittelkontrolle',
	'vergiftung',
	'poisoning',
	'rückruf',
	'recall',
	'warnung',
	'kakerlake',
	'ratten',
	'polizei',
	'razzia',
];
