import _ from 'lodash';

import { POST_COUNTS_AGE_DAYS } from '../constants/post-counts.constant.js';
import type { SocialPost } from '../entities/social-post.entity.js';

/** What a read of a post gives: the five counts a post and each of its snapshots carry. */
export const COUNT_FIELDS = ['views', 'likes', 'shares', 'comments', 'saves'] as const;
export type PostCounts = Pick<SocialPost, (typeof COUNT_FIELDS)[number]>;

const DAY_MS = 24 * 3600 * 1000;

/** Whether a read at `at` is at or past the age a post's counts are kept at. */
export const isFinalAge = (postedAt: Date, at: Date): boolean =>
	at.getTime() - postedAt.getTime() >= POST_COUNTS_AGE_DAYS * DAY_MS;

/** A `clockworks/tiktok-scraper` item's counts (hashtag, profile and post-URL items alike). */
export const clockworksCounts = (row: any): PostCounts => ({
	views: row?.playCount ?? 0,
	likes: row?.diggCount ?? 0,
	shares: row?.shareCount ?? 0,
	comments: row?.commentCount ?? 0,
	saves: row?.collectCount ?? 0,
});

const positive = (n: unknown) => (typeof n === 'number' && n > 0 ? n : 0);

/**
 * An `apify/instagram-scraper` or `apify/instagram-profile-scraper` post's counts: views on videos
 * only, a hidden like count (-1) as 0, no saves (Instagram doesn't show them).
 */
export const instagramCounts = (row: any): PostCounts => ({
	views: positive(row?.videoPlayCount ?? row?.videoViewCount),
	likes: positive(row?.likesCount),
	shares: positive(row?.sharesCount),
	comments: positive(row?.commentsCount),
	saves: 0,
});

/** The counts a scrape's row carries, each 0 when absent. */
export const countsOf = (fields: Partial<PostCounts>): PostCounts =>
	Object.fromEntries(COUNT_FIELDS.map(f => [f, fields[f] ?? 0])) as PostCounts;

/** The TikTok video id of a post URL (`/video/<id>`), or null. */
export const tikTokVideoId = (url: unknown): string | null =>
	typeof url === 'string' ? (/\/video\/(\d+)/.exec(url)?.[1] ?? null) : null;

/**
 * The posts one refresh can pay for, oldest first so none passes the late limit, and what they
 * are planned to cost; the rest wait for the next run.
 */
export const planCountsRefresh = <P extends { postedAt: Date }>(
	posts: P[],
	priceOf: (post: P) => number,
	budgetUsd: number,
): { posts: P[]; spendUsd: number; skipped: number } => {
	let spendUsd = 0;
	const taken: P[] = [];
	for (const post of _.sortBy(posts, p => p.postedAt.getTime())) {
		if (spendUsd + priceOf(post) > budgetUsd + 1e-9) break;
		spendUsd += priceOf(post);
		taken.push(post);
	}
	return { posts: taken, spendUsd, skipped: posts.length - taken.length };
};
