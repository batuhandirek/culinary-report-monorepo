import type { Tool } from '@mastra/core/tools';
import { z } from 'zod/v4';

import { monthName } from 'src/modules/venues/util/month.js';

import type { EvidenceContext } from '../interfaces/report-evidence.interface.js';

import { defineTool } from './define-tool.js';
import { ToolRun } from './tool-run.js';

const METRICS = ['posts', 'views', 'creators', 'reviews', 'avg_stars', 'reply_rate', 'followers', 'rating'] as const;

/** A figure over the last six months, from the brand's stored reports. */
export const historyTool = (ctx: EvidenceContext, run: ToolRun): Tool =>
	defineTool({
		id: 'history',
		description:
			'A figure month by month over the last six months, from the stored reports: posts by others, views, creators, Google reviews, ' +
			"average stars, reply rate, an own account's followers (handle) or a place's all-time Google rating (branchId). " +
			'A month that is missing was not tracked, never zero.',
		inputSchema: z.object({
			metric: z.enum(METRICS),
			handle: z.string().nullable().default(null).describe('followers: the own account'),
			branchId: z.string().nullable().default(null).describe('rating: the place (venueId from places); the first place when null'),
		}),
		execute: async (input): Promise<unknown> =>
			run.take('history', input, () => {
				const { data, history } = ctx;
				const prev = data.previous;
				const row = (month: string, value: number | undefined | null) =>
					value === undefined || value === null ? [] : [{ month: monthName(month), value }];
				switch (input.metric) {
					case 'posts':
					case 'views':
					case 'creators': {
						const field = input.metric === 'posts' ? 'postCount' : input.metric;
						return {
							months: [
								...history.flatMap(h => row(h.month, h.social?.[field])),
								...(prev ? row(prev.month, prev.social[field]) : []),
								...row(data.month, data.social[field]),
							],
						};
					}
					case 'reviews':
					case 'avg_stars':
					case 'reply_rate': {
						const field = input.metric === 'reviews' ? 'count' : input.metric === 'avg_stars' ? 'avgStars' : 'replyRate';
						const scale = (v: number | undefined) => (v === undefined ? undefined : field === 'replyRate' ? Math.round(v * 100) : v);
						return {
							unit: field === 'replyRate' ? 'percent of reviews answered' : field === 'avgStars' ? 'stars' : 'reviews',
							months: [
								...history.flatMap(h => row(h.month, scale(h.reviews?.[field]))),
								...(prev?.reviews ? row(prev.month, scale(prev.reviews[field])) : []),
								...row(data.month, scale(data.reviews[field])),
							],
							note: 'A missing month had no reviews stored (not scraped), never zero.',
						};
					}
					case 'followers': {
						const account = data.ownAccounts?.find(a => a.handle.toLowerCase() === input.handle?.toLowerCase()) ?? data.ownAccounts?.[0];
						if (!account) return { error: 'No own account tracked' };
						return {
							handle: account.handle,
							platform: account.platform,
							months: [
								...history.flatMap(h => {
									const f = h.followers?.find(a => a.handle === account.handle && a.platform === account.platform);
									return f ? row(h.month, f.followers) : [];
								}),
								...(account.followers !== undefined && account.followersChange !== undefined && prev ?
									row(prev.month, account.followers - account.followersChange)
								:	[]),
								...row(data.month, account.followers),
							],
							pointsThisMonth: account.followerPoints,
							note: 'Monthly counts are the snapshot at each month\'s close; pointsThisMonth are the days a scrape saw the profile.',
						};
					}
					case 'rating': {
						const branch = input.branchId ? data.branches.find(b => b.venueId === input.branchId) : data.branches[0];
						if (!branch) return { error: 'No such place' };
						return {
							place: branch.name,
							months: branch.ratingTrend.map(p => ({ month: monthName(p.month), rating: p.rating, reviewsCount: p.reviewsCount })),
							note: 'All-time Google rating and review count at the close of each month.',
						};
					}
				}
			}),
	});
