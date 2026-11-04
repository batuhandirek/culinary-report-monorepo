import type { Tool } from '@mastra/core/tools';
import { z } from 'zod/v4';

import { defineTool } from 'src/modules/reports/tools/define-tool.js';

import type { AnalystRun } from './analyst-run.js';

/** The answer's plan, shown to the admin as a checklist and rewritten as the work goes */
export const planTool = (run: AnalystRun): Tool =>
	defineTool({
		id: 'plan',
		description:
			'Write or update your plan: the steps you will take to answer, each with its status. Call it first for any question ' +
			'that needs more than one query, and again as steps finish (send the whole list each time). The admin sees it live.',
		inputSchema: z.object({
			steps: z
				.array(
					z.object({
						title: z.string().describe('One short line: what this step finds out'),
						status: z.enum(['todo', 'doing', 'done', 'skipped']),
					}),
				)
				.min(1)
				.max(12),
		}),
		execute: async ({ steps }) => {
			await run.setPlan(steps);
			return { ok: true };
		},
	});
