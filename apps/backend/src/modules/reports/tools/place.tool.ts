import type { Tool } from '@mastra/core/tools';
import { z } from 'zod/v4';

import { monthName } from 'src/modules/venues/util/month.js';

import type { EvidenceContext } from '../interfaces/report-evidence.interface.js';

import { defineTool } from './define-tool.js';
import { ToolRun } from './tool-run.js';

/** One place's Google Maps searches, its neighbourhood's openings and closures, or its rating trend. */
export const placeTool = (ctx: EvidenceContext, run: ToolRun): Tool =>
	defineTool({
		id: 'place',
		description:
			"One place's own figures: search_ranks (where it appears on the Google Maps searches a guest would type, the top ten now and who was in it last month), " +
			'nearby_changes (places that opened, closed or reopened in its district this quarter) or rating_trend (its all-time Google rating at each month\'s close). ' +
			'These belong to that address only: never add or compare them across places.',
		inputSchema: z.object({
			branchId: z.string().nullable().default(null).describe('The place (venueId from places); the first place when null'),
			part: z.enum(['search_ranks', 'nearby_changes', 'rating_trend']),
		}),
		execute: async (input): Promise<unknown> =>
			run.take('place', input, () => {
				const branch = input.branchId ? ctx.data.branches.find(b => b.venueId === input.branchId) : ctx.data.branches[0];
				if (!branch) return { error: 'No such place' };
				const before = ctx.previousData?.branches?.find(b => b.venueId === branch.venueId);
				switch (input.part) {
					case 'search_ranks':
						if (!branch.searchRanks?.length) return { place: branch.name, error: 'No Google Maps search tracked for this place this month' };
						return {
							place: branch.name,
							searches: branch.searchRanks.map(r => {
								const last = before?.searchRanks?.find(x => x.query === r.query);
								return {
									search: r.query,
									yourPlace: r.rank ?? `not in the top ${r.results}`,
									earlierMonths: r.history.map(h => ({ month: monthName(h.month), place: h.rank ?? 'not in the results' })),
									topTenNow: r.top.map(t => `${t.isVenue ? `${t.name} (you)` : t.name}${t.rating ? ` ${t.rating.toFixed(1)}★` : ''}${t.reviewsCount ? ` (${t.reviewsCount} reviews)` : ''}`),
									topTenLastMonth: last ? last.top.map(t => (t.isVenue ? `${t.name} (you)` : t.name)) : 'not stored',
								};
							}),
						};
					case 'nearby_changes':
						if (!branch.neighbourhood) return { place: branch.name, error: 'No district on record: openings nearby are unknown' };
						return {
							place: branch.name,
							district: branch.neighbourhood.changes.district,
							window: `${monthName(branch.neighbourhood.changes.from)} to ${monthName(branch.neighbourhood.changes.to)}`,
							opened: branch.neighbourhood.changes.opened,
							openedOnlyAPostAnnounced: branch.neighbourhood.changes.openedFromPosts,
							closed: branch.neighbourhood.changes.closed,
							reopened: branch.neighbourhood.changes.reopened,
							onYourStreet: branch.neighbourhood.changes.street,
							venues: branch.neighbourhood.changes.venues.map(v => ({
								name: v.name,
								category: v.category,
								kind: v.kind,
								firstSeen: v.date,
								sameStreet: v.sameStreet,
								fromAPost: v.source === 'posts',
							})),
							note: 'Dates are when a scrape first saw it, or the first post saying it had just opened: never an opening date.',
						};
					case 'rating_trend':
						return {
							place: branch.name,
							months: branch.ratingTrend.map(p => ({ month: monthName(p.month), rating: p.rating, reviewsCount: p.reviewsCount })),
							againstOthers: branch.ratingBenchmark,
						};
				}
			}),
	});
