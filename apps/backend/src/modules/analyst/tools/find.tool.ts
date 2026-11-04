import type { Tool } from '@mastra/core/tools';
import { z } from 'zod/v4';

import { defineTool } from 'src/modules/reports/tools/define-tool.js';

import type { AnalystSqlService } from '../services/analyst-sql.service.js';

import { type AnalystRun, LOOKUP_BUDGET_SPENT } from './analyst-run.js';

/** A name to the rows it may be: brands, branches, topics, aspects, wordings, creators, cities */
export const findTool = (run: AnalystRun, sqlService: AnalystSqlService): Tool =>
	defineTool({
		id: 'find',
		description:
			'Find rows by name before querying them: a brand or a branch (venue), a kind of food (topic), an aspect, a wording ' +
			'(term), a creator or a city. Returns ids and keys, best matches first. Use it instead of guessing a spelling in SQL.',
		inputSchema: z.object({
			type: z
				.enum(['brand', 'venue', 'topic', 'aspect', 'term', 'creator', 'city'])
				.nullable()
				.default(null)
				.describe(
					'What it is; null searches brands, venues, topics, aspects, creators and cities',
				),
			name: z.string().min(1).describe('The name or part of it'),
			cityId: z
				.string()
				.nullable()
				.default(null)
				.describe('cities.id to stay in one city (brands, venues)'),
		}),
		execute: async ({ type, name, cityId }) => {
			if (!run.takeLookup()) return { error: LOOKUP_BUDGET_SPENT };
			const input = { type, name, cityId };
			const part = await run.addPart({ type: 'lookup', tool: 'find', input }, true);
			try {
				const found = await sqlService.search(type ?? undefined, name, cityId ?? undefined);
				const summary =
					found.length ?
						found
							.slice(0, 5)
							.map(f => `${f.label} (${f.type})`)
							.join(', ')
					:	'Nothing found';
				await run.updatePart(part, {
					data: { type: 'lookup', tool: 'find', input, summary },
					streaming: false,
				});
				return { found };
			} catch (e) {
				const error = (e as Error).message;
				await run.updatePart(part, {
					data: { type: 'lookup', tool: 'find', input, error },
					streaming: false,
				});
				return { error };
			}
		},
	});
