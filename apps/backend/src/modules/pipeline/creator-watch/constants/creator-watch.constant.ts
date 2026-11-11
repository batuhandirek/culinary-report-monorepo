import { POST_STREAM_PRIORITY, type OperationRun } from '../../shared/util/operations.js';
import { CREATOR_WATCH_QUEUE } from '../queues/creator-watch.queue.js';

export const CREATOR_WATCH_DAY: OperationRun = {
	operation: 'creator-watch',
	cadence: 'day',
	queue: CREATOR_WATCH_QUEUE,
	priority: POST_STREAM_PRIORITY,
};

// The watched creators' scrape (`CreatorWatchSchedule`): daily, 04:20 UTC
export const CREATOR_WATCH_DAY_CRON = '20 4 * * *';

/**
 * A city's run spends at most this on Apify: ~300 creators, TikTok's new videos at ~$0.003 (~$0.50
 * a day), a third of the Instagram profiles a day at ~$0.003: ~$20 a month
 */
export const CREATOR_WATCH_BUDGET_USD = 3;

/** How far back a TikTok creator scrape reaches when the city has no earlier finished run, and at most */
export const CREATOR_TIKTOK_MAX_DAYS = 8;

/**
 * "Scrape now" on a creator's page: their profiles' latest posts (TikTok's latest ten at ~$0.003,
 * an Instagram profile ~$0.003), the last 30 days' kept: a few cents
 */
export const CREATOR_SCRAPE_NOW_USD = 0.1;
export const CREATOR_SCRAPE_NOW_DAYS = 30;
