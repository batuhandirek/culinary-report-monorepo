export type LlmBacklogJobPayload = {
	/** Who asked: the daily cron or an admin's "Run now" */
	trigger: 'cron' | 'admin';
};

/**
 * Drain the registered LLM backlogs within the day's budget (`LlmBacklogService.drain`). A
 * `stately` queue with one `singletonKey`: one run at a time and one waiting, so a slow day never
 * overlaps the next.
 */
export class LlmBacklogJob {
	public static readonly jobName = 'llm-backlog';
	constructor(public payload: LlmBacklogJobPayload) {}
}
