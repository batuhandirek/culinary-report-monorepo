/**
 * LLM work over stored data that finishes over days: reading the parts of claims, deciding wordings,
 * reading amounts. The owning service registers it at module init (`LlmBacklogRegistry.register`)
 * and stays its only writer; the daily `llm-backlog` job drains every backlog a little each day
 * within the day's token budget and the free allowance (`LlmBacklogService.drain`).
 *
 * Never a backlog: extracting posts again (it recreates mentions and loses their matches and
 * admins' corrections), or anything that costs per call beyond the LLM allowance (Apify, paid
 * models). A backlog runs on the allowance's models only, as everything outside `llmPaid` does. The
 * one exception is a backlog whose spend the user said yes to and that waits for it (`waitsFor`):
 * `statement-embeddings`, cents of embeddings once, then a few thousand claims a month.
 */
export interface LlmBacklog {
	/** Stable id, the `BacklogRun.key` (`review-themes`) */
	key: string;
	/** What the Data page calls it */
	label: string;
	/** Smaller runs first (10 before 20) */
	priority: number;
	/**
	 * Reading: what a source says, by the reading agents (claims, their labels, wordings' topics, a
	 * re-read). Keeps draining while `LLM_INGESTION_ONLY` pauses the rest, which wait in their queue.
	 */
	ingestion?: boolean;
	/** Items still to do; 0 ends the backlog for the day */
	remaining(): Promise<number>;
	/**
	 * Does one batch and flushes it. `done` counts the items it settled (an item looked at with
	 * nothing found counts: it is not asked again); `tokens` the batch's reported usage, when the
	 * agent gives it. Throws what `isFatalProviderError` matches once every account is out of
	 * allowance, after flushing what finished.
	 */
	runBatch(): Promise<{ done: number; tokens?: number }>;
	/**
	 * Why the backlog must not run now (a spend not approved yet, another backlog to finish
	 * first), or null when it may. A waiting backlog runs no batch; its day's run says `waiting`
	 * with the reason.
	 */
	waitsFor?(): Promise<string | null>;
}
