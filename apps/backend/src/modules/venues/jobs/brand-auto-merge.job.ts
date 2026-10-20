export type BrandAutoMergeJobPayload = {
	/** The city whose venues were just saved */
	cityId: string;
};

/**
 * Venues of a city were saved: brands that are one for sure are merged (`BrandService.autoMerge`).
 * Queued by every venue scrape, one waiting per city (the queue is `stately`).
 */
export class BrandAutoMergeJob {
	public static readonly jobName = 'brand-auto-merge';
	constructor(public payload: BrandAutoMergeJobPayload) {}
}
