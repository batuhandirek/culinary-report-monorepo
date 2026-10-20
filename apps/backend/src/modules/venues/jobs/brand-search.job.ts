export type BrandSearchJobPayload = { brandId: string; cityId: string };

/** "Find branches": one Google Maps search for a brand's name in a city, off the request (it takes ~30 s). */
export class BrandSearchJob {
	public static readonly jobName = 'brand-search';
	constructor(public payload: BrandSearchJobPayload) {}
}
