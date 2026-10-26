import type { Tool } from '@mastra/core/tools';
import _ from 'lodash';
import { z } from 'zod/v4';

import { weekStart } from 'src/modules/venues/util/week.js';

import type { EvidenceContext } from '../interfaces/report-evidence.interface.js';

import { defineTool } from './define-tool.js';
import { ToolRun } from './tool-run.js';

const MAX_SHOWN = 10;
const SUMMARY_CHARS = 160;

/** The month's posts about the brand, or its own, filtered. */
export const postsTool = (ctx: EvidenceContext, run: ToolRun): Tool =>
	defineTool({
		id: 'posts',
		description:
			"The month's TikTok, Instagram and blog posts about the brand by others (own: false) or from the brand's own accounts (own: true), " +
			'each with its date, creator and their followers, views, whether it was paid or gifted, whether the creator visited, its sentiment and a one-line summary. ' +
			"Filter by week (its Monday), platform or paid; sort by views or date.",
		inputSchema: z.object({
			own: z.boolean().default(false).describe("The brand's own posts instead of posts by others"),
			week: z.string().nullable().default(null).describe("The week's Monday, YYYY-MM-DD"),
			platform: z.enum(['tiktok', 'instagram', 'blog']).nullable().default(null),
			promotional: z.boolean().nullable().default(null).describe('Only paid or gifted posts (true) or only organic ones (false)'),
			sort: z.enum(['views', 'date']).default('views'),
			limit: z.number().int().min(1).max(MAX_SHOWN).default(6),
		}),
		execute: async (input): Promise<unknown> =>
			run.take('posts', input, () => {
				const source = input.own ? ctx.data.ownPosts : ctx.data.posts;
				const matched = source.filter(
					p =>
						(input.week === null || weekStart(new Date(p.postedAt), ctx.timeZone) === input.week) &&
						(input.platform === null || p.platform === input.platform) &&
						(input.promotional === null || p.promotional === input.promotional),
				);
				const sorted = input.sort === 'views' ? _.orderBy(matched, p => p.views, 'desc') : _.orderBy(matched, p => p.postedAt, 'desc');
				return {
					matched: matched.length,
					shown: Math.min(matched.length, input.limit),
					posts: sorted.slice(0, input.limit).map(p => ({
						date: p.postedAt.slice(0, 10),
						week: weekStart(new Date(p.postedAt), ctx.timeZone),
						platform: p.platform,
						author: p.author,
						authorFollowers: p.authorFans,
						views: p.views,
						interactions: p.engagements,
						paidOrGifted: p.promotional,
						visited: p.visited,
						sentiment: p.sentiment,
						summary: p.summary.length > SUMMARY_CHARS ? `${p.summary.slice(0, SUMMARY_CHARS - 1)}…` : p.summary,
						praised: _.uniq(p.praise.map(x => x.topic)),
						criticised: _.uniq(p.complaints.map(x => x.topic)),
						dishes: p.dishes.map(d => d.name),
					})),
					note: input.own ? "The brand's own posts are not word of mouth." : 'Instagram gives no follower counts for creators.',
				};
			}),
	});
