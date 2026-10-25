export type FoodTopicRelinkJobPayload = Record<string, never>;

/**
 * A food topic or its aliases changed: everything linked to topics by matching text is re-resolved
 * (`FoodTopicRelinkService.relinkAll`). A `stately` queue with one `singletonKey`.
 */
export class FoodTopicRelinkJob {
	public static readonly jobName = 'food-topic-relink';
	public static readonly singletonKey = 'all';
	constructor(public payload: FoodTopicRelinkJobPayload) {}
}
