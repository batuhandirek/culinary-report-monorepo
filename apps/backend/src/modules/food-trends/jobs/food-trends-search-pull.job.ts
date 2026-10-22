export type FoodTrendsSearchPullJobPayload = { cityId: string; quarter: string };

/** The anchored Google Trends pull of a city's quarter: one actor run per group, minutes in all. */
export class FoodTrendsSearchPullJob {
	public static readonly jobName = 'food-trends-search-pull';
	constructor(public payload: FoodTrendsSearchPullJobPayload) {}
}
