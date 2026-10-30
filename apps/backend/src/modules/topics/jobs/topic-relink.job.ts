export type TopicRelinkJobPayload = Record<string, never>;

/**
 * A food topic or its aliases changed: everything linked to topics by matching text is re-resolved
 * (`TopicRelinkService.relinkAll`). A `stately` queue with one `singletonKey`.
 */
export class TopicRelinkJob {
	public static readonly jobName = 'topic-relink';
	public static readonly singletonKey = 'all';
	constructor(public payload: TopicRelinkJobPayload) {}
}
