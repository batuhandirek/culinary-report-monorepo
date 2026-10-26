import type { Tool } from '@mastra/core/tools';
import { z } from 'zod/v4';

import type { EvidenceContext } from '../interfaces/report-evidence.interface.js';

import { defineTool } from './define-tool.js';
import { ToolRun } from './tool-run.js';

const MAX_SHOWN = 10;

/** The month's reviews, filtered: what guests wrote. */
export const reviewsTool = (ctx: EvidenceContext, run: ToolRun): Tool =>
	defineTool({
		id: 'reviews',
		description:
			"The brand's reviews of the month (and the week after), newest first, each with its date, stars, a short excerpt, the themes it praised " +
			'or criticised, the changes the guest noticed and whether the owner answered. Filter by stars (exact or at most), a theme or topic word, ' +
			'a week (its Monday, YYYY-MM-DD), the platform or whether it was answered. Quote excerpts briefly; never name a reviewer (none is stored).',
		inputSchema: z.object({
			stars: z.number().int().min(1).max(5).nullable().default(null).describe('Exactly this many stars'),
			maxStars: z.number().int().min(1).max(5).nullable().default(null).describe('This many stars or fewer'),
			theme: z.string().nullable().default(null).describe('A word of a praise or complaint theme, e.g. "wait", "price", "staff"'),
			week: z.string().nullable().default(null).describe("The week's Monday, YYYY-MM-DD"),
			platform: z.enum(['google', 'tripadvisor']).nullable().default(null),
			replied: z.boolean().nullable().default(null),
			limit: z.number().int().min(1).max(MAX_SHOWN).default(6),
		}),
		execute: async (input): Promise<unknown> =>
			run.take('reviews', input, () => {
				const theme = input.theme?.toLowerCase();
				const matched = ctx.reviews.filter(
					r =>
						(input.stars === null || r.stars === input.stars) &&
						(input.maxStars === null || (r.stars !== undefined && r.stars <= input.maxStars)) &&
						(!theme || [...r.complaints, ...r.praise, ...r.changes].some(t => t.toLowerCase().includes(theme))) &&
						(input.week === null || r.week === input.week) &&
						(input.platform === null || r.platform === input.platform) &&
						(input.replied === null || r.replied === input.replied),
				);
				return {
					matched: matched.length,
					shown: Math.min(matched.length, input.limit),
					reviews: matched.slice(0, input.limit),
					note: 'Reviews of the month and the week after; the themes are what the review raised, counted once each.',
				};
			}),
	});
