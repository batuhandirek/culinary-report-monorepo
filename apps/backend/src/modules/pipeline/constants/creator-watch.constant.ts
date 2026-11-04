// The self-kept creator list (`AccountWatchService.creators`, the user's call, 2026-11-04: no list
// to approve, creators come and go by themselves). Measured on Berlin's first three weeks
// (2026-11): 859 TikTok creators made the 1,543 posts by others naming a matched place, the top 200
// half of them, 135 with three or more

/** The window a creator's posts are counted over */
export const CREATOR_WATCH_WINDOW_DAYS = 90;

/** A creator joins with this many posts naming a matched place in the city in the window */
export const CREATOR_WATCH_MIN_POSTS = 3;

/**
 * And stays only while at least this share of their read posts in the window name one: once
 * watched every post of theirs comes in, so a creator whose feed is mostly something else leaves
 */
export const CREATOR_WATCH_MIN_SHARE = 0.3;

/** A creator whose last post naming a matched place is older than this leaves */
export const CREATOR_WATCH_QUIET_DAYS = 60;

/** The list's length at most: the most such posts first, then the most viewed */
export const CREATOR_WATCH_MAX = 300;

/**
 * An Instagram profile returns its twelve latest posts whatever their date and is paid per
 * profile, so a watched one is read every this many days; TikTok pays per new video and is read
 * daily
 */
export const CREATOR_INSTAGRAM_EVERY_DAYS = 3;

/** What one Instagram profile costs, planned (~$0.0026) */
export const CREATOR_INSTAGRAM_PROFILE_USD = 0.003;

/** How far back a TikTok creator scrape reaches when the city has no earlier run, and at most */
export const CREATOR_TIKTOK_MAX_DAYS = 8;
