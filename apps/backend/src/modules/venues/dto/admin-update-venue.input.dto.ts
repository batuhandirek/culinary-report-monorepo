import { tags } from 'typia';

/** What an admin edits on a venue; an absent field is left as it is. */
export interface AdminUpdateVenueInputDto {
	/** Its TheFork, OpenTable or Google booking page, sampled before Google's reservation link; null clears it */
	bookingUrl?: (string & tags.MaxLength<500>) | null;
}
