import type { Tool } from '@mastra/core/tools';
import { z } from 'zod/v4';

import type { EvidenceContext } from '../interfaces/report-evidence.interface.js';

import { defineTool } from './define-tool.js';
import { ToolRun } from './tool-run.js';

const MAX_ITEMS = 8;
const MAX_POSTS = 5;

/** The month's press and what viewers said under the top posts. */
export const pressAndCommentsTool = (ctx: EvidenceContext, run: ToolRun): Tool =>
	defineTool({
		id: 'press_and_comments',
		description:
			"The month's press (features, lists and passing mentions naming the brand, with outlet, date and a summary) and the comments under its top TikTok posts " +
			'(what viewers said by intent, and the questions they kept asking). Absent press means none was found or none was searched for.',
		inputSchema: z.object({}),
		execute: async (input): Promise<unknown> =>
			run.take('press_and_comments', input, () => ({
				press:
					ctx.data.press ?
						{
							features: ctx.data.press.features,
							lists: ctx.data.press.listicles,
							passingMentions: ctx.data.press.passing,
							items: ctx.data.press.items.slice(0, MAX_ITEMS).map(i => ({
								kind: i.kind,
								outlet: i.outlet,
								title: i.title,
								date: i.publishedAt,
								summary: i.summary,
							})),
						}
					:	'no press found this month, or none searched for',
				comments:
					ctx.data.comments ?
						{
							classified: ctx.data.comments.comments,
							byIntent: ctx.data.comments.intents,
							questionsAsked: ctx.data.comments.questions.map(q => ({ topic: q.topic, times: q.count, example: q.example })),
							posts: ctx.data.comments.posts.slice(0, MAX_POSTS).map(p => ({
								author: p.author,
								views: p.views,
								comments: p.comments,
								byIntent: p.intents,
								disagreement: p.disagreement,
							})),
						}
					:	'no comments scraped this month',
			})),
	});
