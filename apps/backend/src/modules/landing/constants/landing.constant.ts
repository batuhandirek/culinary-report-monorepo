// The front page's live edition (`LandingEditionService`): what it counts and how often.

/** The window an edition counts, in days, ending at the start of the build day (UTC) */
export const LANDING_WINDOW_DAYS = 30;
/** An edition is rebuilt once its newest one is this many days old */
export const LANDING_REFRESH_DAYS = 5;
/** Daily at 06:30 UTC: after the daily Instagram scrape (04:00) and the Sunday listening (03:00) */
export const LANDING_CRON = '30 6 * * *';
/** Places on the live list */
export const LANDING_PLACES = 10;
/** How far down the previous window's order a place's old rank is looked for */
export const LANDING_RANK_DEPTH = 50;
/** New in Town looks back this many days for posts calling a place new */
export const LANDING_OPENING_DAYS = 14;
export const LANDING_OPENINGS = 3;
/** A place with more Google reviews than this is no opening, whatever a post says */
export const LANDING_OPENING_MAX_REVIEWS = 300;
/** The dish marquee */
export const LANDING_MARQUEE_DISHES = 8;
/** A dish needs this many posts naming it in the window to be a pick */
export const LANDING_DISH_MIN_POSTS = 5;
/** A cuisine or a praise theme needs this many posts in the window to be a story */
export const LANDING_STORY_MIN_POSTS = 10;
/** A street is a story with this many places posted about on it */
export const LANDING_STREET_MIN_PLACES = 3;
/** What the model reads per place: its most viewed posts' praise and summaries */
export const LANDING_PROMPT_PHRASES = 8;
export const LANDING_PROMPT_SUMMARIES = 5;
/** Ticker items, at most */
export const LANDING_TICKER = 8;
/** Trend tiles */
export const LANDING_TRENDS = 3;
