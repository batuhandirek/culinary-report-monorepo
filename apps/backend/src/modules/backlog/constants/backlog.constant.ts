import type { WorkflowRef } from 'src/modules/durable-workflows/interfaces/durable-workflows.interface.js';

/**
 * Daily at 22:00 UTC: the end of the allowance's day (OpenAI's free daily tokens reset at
 * 00:00 UTC), after every pipeline cron of the day, so the pipeline's own LLM work comes first
 * and the backlogs get what the day leaves.
 */
export const LLM_BACKLOG_CRON = '0 22 * * *';

/** The one `dedupe` key of the drain on `LLM_BACKLOG_QUEUE`: one run at a time, one waiting */
export const LLM_BACKLOG_SINGLETON_KEY = 'daily';

/** A run stops starting batches after this long, so it ends well inside the day */
export const LLM_BACKLOG_MAX_MINUTES = 150;

/** `LlmBacklogWorkflows.drain` by name, for `LlmBacklogService.queue` (the workflow depends on the service) */
export const LLM_BACKLOG_WORKFLOW: WorkflowRef = {
	className: 'LlmBacklogWorkflows',
	name: 'drain',
};
