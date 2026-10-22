// `SCRAPE_BLOGS`: reading a city's food blogs through their feeds (`BlogScrapeService`). Free:
// plain fetches, one blog at a time.

/** How far back an article may be published to be read: a new blog's first run reads this much. */
export const BLOG_BACKFILL_MONTHS = 6;

/** Feed pages (`?paged=N`, WordPress) one blog reads at most a run, to reach the backfill window. */
export const BLOG_FEED_MAX_PAGES = 10;

/** A feed item with fewer words than this is an excerpt: the article page is fetched for the text. */
export const BLOG_MIN_FEED_WORDS = 150;

/** Article pages one blog fetches at most a run; the rest wait for the next run. */
export const BLOG_MAX_ARTICLE_FETCHES = 40;

/** An article's stored text is cut here (~4,000 tokens): the venues are named well before. */
export const BLOG_MAX_TEXT_CHARS = 16_000;

/** The pause before each request to a blog, so a run never hammers a small site. */
export const BLOG_REQUEST_PAUSE_MS = 800;

/** Size caps: a feed page with full articles can be large, an article page's text is near its start. */
export const BLOG_MAX_FEED_BYTES = 5 * 1024 * 1024;
export const BLOG_MAX_PAGE_BYTES = 3 * 1024 * 1024;

/**
 * The User-Agent of feed requests: a common feed reader's. Some magazines answer a browser's
 * with a script challenge and let only known feed readers through (tip Berlin, 2026-10-22: 403
 * for any other name, 200 for FreshRSS, Feedbin or SimplePie). Pages go with a browser's.
 */
export const BLOG_FEED_USER_AGENT = 'Mozilla/5.0 (compatible; FreshRSS/1.24.3; +https://freshrss.org)';
