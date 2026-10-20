import { tags } from 'typia';

/**
 * A competitor to add: one place (`venueId`) or a whole brand (`brandId`), exactly one; for the
 * whole brand, or for one of its branches (`branchId`).
 */
export interface AdminAddCompetitorInputDto {
	venueId?: string & tags.Format<'uuid'>;
	brandId?: string & tags.Format<'uuid'>;
	branchId?: string & tags.Format<'uuid'>;
}

export interface AdminListCompetitorSuggestionsInputDto {
	/** The city to suggest in; the brand's first city without it */
	cityId?: string & tags.Format<'uuid'>;
	/** Suggest around this branch instead of the city's most reviewed one */
	branchId?: string & tags.Format<'uuid'>;
}
