// When the operations' periods start: every one of them runs on its own schedule, and the ones
// that need another's work call it (`runOperation`), so these are only the starting times

/** A month's runs: the 2nd, 06:00 UTC, for the month that just ended, so its reviews are all in */
export const MONTH_CRON = '0 6 2 * *';

/** A week's runs: Sundays, 03:00 UTC */
export const WEEK_CRON = '0 3 * * 0';

/**
 * How far back a week's run keeps posts: the week since the last one plus a day of slack, so a
 * late run leaves no gap. TikTok's search asks for `WEEK`.
 */
export const WEEK_DAYS = 8;

export const DAY_MS = 86_400_000;
