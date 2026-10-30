export type TopicCityRefreshJobPayload = {
	cityId: string;
};

/**
 * Something a city's topic links read changed (a post extracted or matched, an account
 * linked, a venue saved, a menu scraped): its mentions' topics are re-resolved, then its venues'
 * tags refreshed. A `stately` queue with the city as `singletonKey`, so a burst refreshes once more at most.
 */
export class TopicCityRefreshJob {
	public static readonly jobName = 'topic-city-refresh';
	constructor(public payload: TopicCityRefreshJobPayload) {}
}
