import type { Tool } from '@mastra/core/tools';
import { z } from 'zod/v4';

import { defineTool } from 'src/modules/reports/tools/define-tool.js';

import type { AnalystSqlService } from '../services/analyst-sql.service.js';

import { type AnalystRun, LOOKUP_BUDGET_SPENT } from './analyst-run.js';

/** The database's own description: every readable table, or some tables' columns and links */
export const schemaTool = (run: AnalystRun, sqlService: AnalystSqlService): Tool =>
	defineTool({
		id: 'schema',
		description:
			'The database schema. Without tables: every table you may read with its estimated row count. With tables: their ' +
			"columns (type, null, the column a foreign key points at, an enum's values). Check a table before your first query on it.",
		inputSchema: z.object({
			tables: z
				.array(z.string())
				.max(12)
				.default([])
				.describe('Table names; empty for the list of tables'),
		}),
		execute: async ({ tables }) => {
			if (!run.takeLookup()) return { error: LOOKUP_BUDGET_SPENT };
			const part = await run.addPart(
				{ type: 'lookup', tool: 'schema', input: { tables } },
				true,
			);
			try {
				const text = await sqlService.schema(tables);
				const summary =
					tables.length ? `Columns of ${tables.join(', ')}` : 'The list of tables';
				await run.updatePart(part, {
					data: { type: 'lookup', tool: 'schema', input: { tables }, summary },
					streaming: false,
				});
				return { schema: text };
			} catch (e) {
				const error = (e as Error).message;
				await run.updatePart(part, {
					data: { type: 'lookup', tool: 'schema', input: { tables }, error },
					streaming: false,
				});
				return { error };
			}
		},
	});
