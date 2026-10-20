/** One place in a Google Maps search's top ten. */
export interface VenueSearchRankEntry {
	placeId: string;
	name: string;
	rating?: number;
	reviewsCount?: number;
	/** Our venue, when we know the place */
	venueId?: string;
}
