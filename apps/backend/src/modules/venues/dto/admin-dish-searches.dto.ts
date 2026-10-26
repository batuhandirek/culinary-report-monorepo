import { tags } from 'typia';

export interface AdminGetDishSearchesInputDto {
	cityId: string & tags.Format<'uuid'>;
	/** The dish topic's key, e.g. `pasta` */
	topicKey: string & tags.MinLength<1>;
	/** The snapshot to show, `YYYY-MM-DD`; the newest when absent */
	searchedOn?: string & tags.Pattern<'^[0-9]{4}-[0-9]{2}-[0-9]{2}$'>;
}

/** One place in a dish search's top ten. */
export interface AdminDishSearchPlaceOutputDto {
	rank: number;
	placeId: string;
	name: string;
	rating?: number;
	reviewsCount?: number;
	/** Our venue, when we keep the place */
	venueId?: string;
	/** Its rank on the same search in the snapshot before; absent when it was not in that top ten */
	previousRank?: number;
}

/** One dish's search in one district ("pasta Mitte Berlin"). */
export interface AdminDishSearchDistrictOutputDto {
	district: string;
	searchedAt: Date;
	/** Whether the same search ran in the snapshot before: without it a place's move is unknown */
	previousSearched: boolean;
	places: AdminDishSearchPlaceOutputDto[];
}

/** A dish's Google Maps top ten in each district of a city, in one dated snapshot. */
export interface AdminDishSearchesOutputDto {
	/** Every snapshot the dish was searched in (`YYYY-MM-DD`), newest first */
	snapshots: string[];
	/** The snapshot shown; absent when the dish was never searched */
	searchedOn?: string;
	/** The snapshot before it, what `previousRank` compares with; absent for the first */
	previousOn?: string;
	/** Districts searched in the snapshot, alphabetical */
	districts: AdminDishSearchDistrictOutputDto[];
}

/** One dish search a venue was in the top ten of. */
export interface AdminVenueDishSearchOutputDto {
	topicKey: string;
	topicLabel: string;
	district: string;
	/** One per snapshot the search ran in, newest first; `rank` absent when it was not in the top ten */
	ranks: { searchedOn: string; rank?: number }[];
}

/** A venue's places on the dish searches of its city. */
export interface AdminVenueDishSearchesOutputDto {
	/** Its city's latest snapshots (`YYYY-MM-DD`), newest first (six at most) */
	snapshots: string[];
	searches: AdminVenueDishSearchOutputDto[];
}
