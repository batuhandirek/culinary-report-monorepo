export interface TopicsClaudePassJobPayload {
	budgetUsd: number;
}

/**
 * The one-off topics pass on Claude (`TopicsClaudePassService.run`), queued at boot while
 * `TOPICS_CLAUDE_PASS_USD` is set. A `stately` queue with one `singletonKey`, never retried (a
 * retry would pay again; a later boot goes on with what is still pending).
 */
export class TopicsClaudePassJob {
	public static readonly jobName = 'topics-claude-pass';
	public static readonly singletonKey = 'once';
	constructor(public payload: TopicsClaudePassJobPayload) {}
}
