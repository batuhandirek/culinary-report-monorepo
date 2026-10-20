export type BrandChangedJobPayload = {
	/** The brands before and after the change: their mentions are matched again */
	brandIds: string[];
	/** Their branches' cities: the lead scores are worked out again */
	cityIds: string[];
};

/**
 * Brands were merged, split, renamed or re-owned: the social module rematches their mentions
 * (`MentionMatchingService.rematchBrands`), then the cities are scored again.
 */
export class BrandChangedJob {
	public static readonly jobName = 'brand-changed';
	constructor(public payload: BrandChangedJobPayload) {}
}
