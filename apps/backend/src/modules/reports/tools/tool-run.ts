import { MAX_TOOL_CALLS } from '../constants/report-analysis.constant.js';
import type { ReportAnalysisTraceStep } from '../interfaces/report-analysis.interface.js';

export const BUDGET_SPENT = 'Call budget spent: write your answer from what you have.';
const SUMMARY_CHARS = 300;

/**
 * One analysis run's tool calls: the budget (enforced here, whatever the prompt says), the
 * trace the admin sees, and every answer the model was given (the number check reads them).
 * The base agent rebuilds the tools each `generate`, so one of these is made per run.
 */
export class ToolRun {
	readonly calls: ReportAnalysisTraceStep[] = [];
	readonly given: unknown[] = [];
	/** Calls that ran (a refused one is traced but not counted) */
	ran = 0;

	constructor(readonly max = MAX_TOOL_CALLS) {}

	async take<T>(tool: string, input: unknown, fn: () => T | Promise<T>): Promise<T | { error: string }> {
		const step = this.calls.length + 1;
		if (this.ran >= this.max) {
			this.calls.push({ step, tool, input, resultSummary: BUDGET_SPENT });
			return { error: BUDGET_SPENT };
		}
		this.ran++;
		const start = Date.now();
		try {
			const result = await fn();
			this.given.push(result);
			this.calls.push({ step, tool, input, resultSummary: summarize(result), durationMs: Date.now() - start });
			return result;
		} catch (e) {
			const error = `The tool failed: ${(e as Error).message}`;
			this.calls.push({ step, tool, input, resultSummary: error, durationMs: Date.now() - start });
			return { error };
		}
	}
}

const summarize = (result: unknown): string => {
	const text = JSON.stringify(result) ?? String(result);
	return text.length > SUMMARY_CHARS ? `${text.slice(0, SUMMARY_CHARS - 1)}…` : text;
};
