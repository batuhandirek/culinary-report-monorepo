import type { VenueSearchRankEntry } from '../interfaces/venue-search-rank.interface.js';

export interface AdminVenueSearchRankOutputDto {
	id: string;
	/** `YYYY-MM` */
	month: string;
	query: string;
	/** Absent when the venue was not among the results */
	rank?: number;
	results: number;
	top: VenueSearchRankEntry[];
	searchedAt: Date;
}
