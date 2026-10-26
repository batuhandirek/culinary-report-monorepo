import type { Tool } from '@mastra/core/tools';
import _ from 'lodash';
import { z } from 'zod/v4';

import { addDays, monthWeeks, weekStart } from 'src/modules/venues/util/week.js';

import type { EvidenceContext } from '../interfaces/report-evidence.interface.js';
import type { ReportPost } from '../interfaces/report-data.interface.js';

import { defineTool } from './define-tool.js';
import { ToolRun } from './tool-run.js';

const METRICS = ['views', 'posts', 'reviews', 'written_reviews', 'busyness', 'booked'] as const;

const weeklyOf = (posts: ReportPost[], weeks: string[], timeZone: string, value: (p: ReportPost) => number) => {
	const rows = new Map(weeks.map(w => [w, 0]));
	for (const p of posts) {
		const w = weekStart(new Date(p.postedAt), timeZone);
		if (rows.has(w)) rows.set(w, rows.get(w)! + value(p));
	}
	return [...rows].map(([week, v]) => ({ week, value: v }));
};

/** A figure week by week: the report month and, when stored, the month before. */
export const weeklySeriesTool = (ctx: EvidenceContext, run: ToolRun): Tool =>
	defineTool({
		id: 'weekly_series',
		description:
			'A figure week by week (weeks start on Monday, city time): views or posts by others, Google reviews (all or written), ' +
			"a place's busyness index or its booked-out share. months 2 adds the month before when its report is stored. " +
			'Use it to place a move inside the month; the observation already gives the monthly totals.',
		inputSchema: z.object({
			metric: z.enum(METRICS),
			months: z.number().int().min(1).max(2).default(1).describe('1: the report month; 2: the month before too'),
			branchId: z.string().nullable().default(null).describe('busyness and booked only: the place (venueId from places); the first place when null'),
		}),
		execute: async (input): Promise<unknown> =>
			run.take('weekly_series', input, () => {
				const { data, previousData, timeZone } = ctx;
				const months = input.months === 2 && data.previous ? [data.previous.month, data.month] : [data.month];
				const weeks = _.uniq(months.flatMap(monthWeeks));
				const note = input.months === 2 && !data.previous ? 'The month before has no stored report: this month only.' : undefined;
				switch (input.metric) {
					case 'views':
					case 'posts': {
						const posts = [...data.posts, ...(months.length > 1 ? (previousData?.posts ?? []) : [])];
						return {
							unit: input.metric,
							weeks: weeklyOf(posts, weeks, timeZone, p => (input.metric === 'views' ? p.views : 1)),
							note,
						};
					}
					case 'reviews':
					case 'written_reviews': {
						const written = input.metric === 'written_reviews';
						const rows = ctx.reviewWeeks.filter(w => weeks.includes(w.week) || w.week >= weeks.at(-1)!);
						const previous = months.length > 1 ? (previousData?.reviews?.list ?? []) : [];
						const prevByWeek = _.countBy(
							previous.filter(r => !written || r.excerpt),
							r => weekStart(new Date(r.publishedAt), timeZone),
						);
						return {
							unit: input.metric,
							weeks: weeks.map(week => ({
								week,
								value: (rows.find(r => r.week === week)?.[written ? 'written' : 'reviews'] ?? 0) + (prevByWeek[week] ?? 0),
							})),
							weekAfterTheMonth: rows.find(r => r.week === addDays(monthWeeks(data.month).at(-1)!, 7))?.reviews,
							baselinePerWeek: ctx.baselinePerWeek ?? undefined,
							note,
						};
					}
					case 'busyness':
					case 'booked': {
						const branch = input.branchId ? data.branches.find(b => b.venueId === input.branchId) : data.branches[0];
						if (!branch) return { error: 'No such place' };
						if (input.metric === 'busyness') {
							const busy = branch.busyness;
							if (!busy) return { error: 'No popular times sampled for this place' };
							return {
								unit: 'busyness index (0–100, against the place\'s own peak: never compare with another place)',
								weeks: [...(months.length > 1 ? busy.previous?.weeks ?? [] : []), ...busy.weeks].map(w => ({ week: w.week, value: w.index ?? null })),
								monthIndex: busy.index,
								previousMonthIndex: busy.previous?.index,
								note,
							};
						}
						const demand = branch.demand;
						if (!demand) return { error: 'No booking page sampled for this place' };
						return {
							unit: 'booked-out share of Friday and Saturday evening slots, percent',
							evenings: demand.evenings.map(e => ({ date: e.date, value: Math.round(e.booked) })),
							monthBooked: Math.round(demand.booked),
							previousMonthBooked: demand.previousBooked !== undefined ? Math.round(demand.previousBooked) : undefined,
							districtMedian: demand.district?.median,
							note,
						};
					}
				}
			}),
	});
