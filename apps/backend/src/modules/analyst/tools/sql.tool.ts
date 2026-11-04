import type { Tool } from '@mastra/core/tools';
import type { AnalystChart, AnalystPartData } from 'sdk';
import { z } from 'zod/v4';

import { defineTool } from 'src/modules/reports/tools/define-tool.js';

import { ANALYST_MODEL_CELL_CHARS, ANALYST_MODEL_ROWS } from '../constants/analyst.constant.js';
import type { AnalystSqlService } from '../services/analyst-sql.service.js';
import { cellOf, rowsText } from '../util/rows.js';

import { type AnalystRun, QUERY_BUDGET_SPENT } from './analyst-run.js';

type QueryPart = Extract<AnalystPartData, { type: 'query' }>;

/** A chart naming columns the result has, else none (and why, for the model) */
export const chartFor = (
	chart: AnalystChart | null,
	columns: string[],
): { chart?: AnalystChart; note?: string } => {
	if (!chart) return {};
	const missing = [chart.x, ...chart.y].filter(c => !columns.includes(c));
	if (missing.length)
		return { note: `No chart drawn: the result has no column ${missing.join(', ')}.` };
	return { chart };
};

/** One read-only query; its rows go to the model and, cut, into the answer's step */
export const sqlTool = (run: AnalystRun, sqlService: AnalystSqlService): Tool =>
	defineTool({
		id: 'run_sql',
		description:
			'Run one read-only PostgreSQL query (SELECT or WITH). You get the columns and up to ' +
			`${ANALYST_MODEL_ROWS} rows as tab-separated text (∅ is null), and whether there were more. Aggregate in SQL; ` +
			'give every column a distinct name. Set show for a result that answers the question: the admin sees it as a ' +
			'table under your answer, with a chart when you name one.',
		inputSchema: z.object({
			purpose: z.string().describe('What this query finds out, in one short line'),
			sql: z.string().describe('One statement, no trailing semicolon needed'),
			show: z
				.boolean()
				.default(false)
				.describe('A result the admin should see under the answer'),
			title: z.string().nullable().default(null).describe("A shown result's heading"),
			chart: z
				.object({
					kind: z
						.enum(['bar', 'line'])
						.describe('bar for categories, line for months or days in order'),
					x: z.string().describe('The column on the x axis'),
					y: z.array(z.string()).min(1).max(4).describe('Numeric columns to draw'),
				})
				.nullable()
				.default(null)
				.describe('A chart of a shown result'),
		}),
		execute: async ({ purpose, sql, show, title, chart }) => {
			if (!run.takeQuery()) return { error: QUERY_BUDGET_SPENT };
			const base: QueryPart = {
				type: 'query',
				purpose,
				sql,
				show,
				title: title ?? undefined,
			};
			const part = await run.addPart(base, true);
			const result = await sqlService.run(sql);
			if (!result.ok) {
				await run.updatePart(part, {
					data: { ...base, error: result.error, durationMs: result.durationMs },
					streaming: false,
				});
				return { error: result.error };
			}
			const drawn = chartFor(chart, result.columns);
			await run.updatePart(part, {
				data: {
					...base,
					chart: drawn.chart,
					columns: result.columns,
					rows: result.rows,
					rowCount: result.rowCount,
					truncated: result.truncated,
					durationMs: result.durationMs,
				},
				streaming: false,
			});
			const modelRows = result.rows
				.slice(0, ANALYST_MODEL_ROWS)
				.map(r => r.map(c => cellOf(c, ANALYST_MODEL_CELL_CHARS)));
			const more = result.rowCount > ANALYST_MODEL_ROWS || result.truncated;
			return {
				rowCount: result.truncated ? `${result.rowCount}+` : result.rowCount,
				rows: rowsText(result.columns, modelRows),
				...(more ?
					{
						note: `Only the first ${modelRows.length} rows are shown to you: aggregate or narrow the query to see the rest.`,
					}
				:	{}),
				...(drawn.note ? { chartNote: drawn.note } : {}),
			};
		},
	});
