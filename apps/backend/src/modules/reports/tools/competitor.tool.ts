import type { Tool } from '@mastra/core/tools';
import _ from 'lodash';
import { z } from 'zod/v4';

import { monthName } from 'src/modules/venues/util/month.js';

import type { ReportCompetitor } from '../interfaces/report-data.interface.js';
import type { EvidenceContext } from '../interfaces/report-evidence.interface.js';

import { defineTool } from './define-tool.js';
import { ToolRun } from './tool-run.js';

const shares = (counts: Record<string, number>, written: number) =>
	Object.fromEntries(_.sortBy(Object.entries(counts), ([, n]) => -n).map(([topic, n]) => [topic, `${n} of ${written} written reviews`]));

const monthOf = (c: ReportCompetitor, month: string) => ({
	month: monthName(month),
	postsByOthers: c.social.postCount,
	views: c.social.views,
	creators: c.social.creators,
	googleReviews:
		c.reviewsTracked ?
			{
				count: c.reviews.count,
				written: c.reviews.written,
				avgStars: c.reviews.avgStars,
				replyRatePercent: c.reviews.replyRate !== undefined ? Math.round(c.reviews.replyRate * 100) : undefined,
				criticised: shares(c.reviews.complaints, c.reviews.written),
				praised: shares(c.reviews.praise, c.reviews.written),
			}
		:	'not tracked: do not compare reviews',
	weekendTablesBookedPercent: c.demand ? Math.round(c.demand.booked) : undefined,
	footTrafficChangePoints: c.busyness?.previousIndex !== undefined ? Math.round(c.busyness.index - c.busyness.previousIndex) : undefined,
});

/** One competitor's month and the month before. */
export const competitorTool = (ctx: EvidenceContext, run: ToolRun): Tool =>
	defineTool({
		id: 'competitor',
		description:
			"A competitor's figures this month and the month before: posts by others, views, creators, its Google reviews (when tracked: count, stars, " +
			'reply rate, what they praised and criticised as "n of m written reviews"), its weekend tables and its foot-traffic change in points ' +
			"(never a level: Google scales each place to its own peak). Compare reviews only where both have 5+ written reviews.",
		inputSchema: z.object({
			name: z.string().describe("The competitor's name as the report lists it (a part of it is enough)"),
		}),
		execute: async (input): Promise<unknown> =>
			run.take('competitor', input, () => {
				const needle = input.name.toLowerCase();
				const c =
					ctx.data.competitors.find(x => x.name.toLowerCase() === needle) ??
					ctx.data.competitors.find(x => x.name.toLowerCase().includes(needle));
				if (!c) return { error: `No competitor named "${input.name}". The report's competitors: ${ctx.data.competitors.map(x => x.name).join(', ') || 'none'}.` };
				const before = ctx.competitorsPrevious.get(c.venueId);
				return {
					name: c.name,
					category: c.category,
					district: c.district,
					wholeChain: c.branches ? `${c.branches} places counted together` : undefined,
					comparedWithYourBranch: c.against,
					googleRatingAllTime: c.rating,
					thisMonth: monthOf(c, ctx.data.month),
					monthBefore: before && ctx.data.previous ? monthOf(before, ctx.data.previous.month) : 'no stored report for the month before',
				};
			}),
	});
