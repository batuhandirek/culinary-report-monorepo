import { tags } from 'typia';

/** An admin's correction of a mention's brand and venue. */
export interface AdminUpdateMentionInputDto {
	/** The venue it means (and so its brand); null unlinks it, unless `brandId` is given. */
	venueId: (string & tags.Format<'uuid'>) | null;
	/** With no `venueId`: the brand it means, no branch known (a chain named without a branch). */
	brandId?: (string & tags.Format<'uuid'>) | null;
	/** Not a venue at all: no venue, never matched again. */
	ignored?: boolean;
	/** Why, for whoever looks at it next. */
	note?: string & tags.MaxLength<500>;
}
