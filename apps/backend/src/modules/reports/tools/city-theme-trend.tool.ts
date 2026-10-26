import type { Tool } from '@mastra/core/tools';
import { z } from 'zod/v4';

import { FEEDBACK_THEMES, isFeedbackTheme } from 'src/modules/venues/constants/feedback-themes.constant.js';

import type { EvidenceContext } from '../interfaces/report-evidence.interface.js';

import { defineTool } from './define-tool.js';
import { ToolRun } from './tool-run.js';

/** A complaint theme across the city this month: did everyone's move, or only yours? */
export const cityThemeTrendTool = (ctx: EvidenceContext, run: ToolRun): Tool =>
	defineTool({
		id: 'city_theme_trend',
		description:
			"A complaint theme across the city's venues with reviews this month: the share of written reviews raising it, its change on the month before in points, " +
			'how many brands it came up at, and your own share. Tells whether a complaint that grew for you grew everywhere (a wider move) or at your place only.',
		inputSchema: z.object({
			theme: z.string().describe('A theme key (e.g. wait_for_food, price_increase) or a word of its label'),
		}),
		execute: async (input): Promise<unknown> =>
			run.take('city_theme_trend', input, () => {
				if (!ctx.cityThemes) return { error: "The city's themes are not read for a report across cities" };
				const needle = input.theme.toLowerCase().replace(/\s+/g, '_');
				const row =
					ctx.cityThemes.find(t => t.key === needle) ??
					ctx.cityThemes.find(t => t.label.toLowerCase().includes(input.theme.toLowerCase()) || t.key.includes(needle));
				if (!row) return { error: `No city figure for "${input.theme}" this month. Themes with one: ${ctx.cityThemes.map(t => t.key).join(', ')}` };
				const mine = ctx.data.reviews.complaintThemes?.[row.key];
				const written = ctx.data.reviews.written;
				return {
					theme: row.key,
					label: row.label,
					topic: isFeedbackTheme(row.key) ? FEEDBACK_THEMES[row.key].topic : undefined,
					cityShareOfWrittenReviewsPercent: row.reviewShare !== null ? Math.round(row.reviewShare) : 'no written review with a point this month',
					changeOnLastMonthPoints: row.reviewShareChange !== null ? Math.round(row.reviewShareChange) : 'no month before to compare',
					atBrands: row.venues,
					yours: mine !== undefined ? `${mine} of ${written} written reviews (${written ? Math.round((mine / written) * 100) : 0}%)` : 'not raised in your reviews this month',
					note: 'Reviews exist for report venues and their competitors only, so the city figure is those brands.',
				};
			}),
	});
