/**
 * LLM work over stored data that finishes over days: filing themes, linking feedback to dishes,
 * reading amounts. The owning service registers it at module init (`LlmBacklogRegistry.register`)
 * and stays its only writer; the daily `llm-backlog` job drains every backlog a little each day
 * within the day's token budget and the free allowance (`LlmBacklogService.drain`).
 *
 * Never a backlog: extracting posts again (it recreates mentions and loses their matches and
 * admins' corrections), or anything that costs per call beyond the LLM allowance (Apify, paid
 * models). A backlog runs on the allowance's model only.
 */
export interface LlmBacklog {
	/** Stable id, the `BacklogRun.key` (`review-themes`) */
	key: string;
	/** What the Data page calls it */
	label: string;
	/** Smaller runs first (10 before 20) */
	priority: number;
	/** Items still to do; 0 ends the backlog for the day */
	remaining(): Promise<number>;
	/**
	 * Does one batch and flushes it. `done` counts the items it settled (an item looked at with
	 * nothing found counts: it is not asked again); `tokens` the batch's reported usage, when the
	 * agent gives it. Throws what `isFatalProviderError` matches once every account is out of
	 * allowance, after flushing what finished.
	 */
	runBatch(): Promise<{ done: number; tokens?: number }>;
}
