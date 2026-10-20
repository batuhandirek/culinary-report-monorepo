import { tags } from 'typia';

export interface UpdateBlogEntryInputDto {
	title?: string & tags.MinLength<1> & tags.MaxLength<300>;

	content?: string;

	// Pass null to clear the excerpt.
	excerpt?: (string & tags.MaxLength<600>) | null;

	// Note: slug is immutable after creation and is intentionally not updatable.

	// Cover image handling:
	//  - a data URL (`data:image/...;base64,...`) → upload and replace,
	//  - the existing hosted URL (`https://…`) → left unchanged,
	//  - `null` → remove the cover image,
	//  - omitted → left unchanged.
	coverImage?: string | null;

	// Full replacement of the entry's tag set by name; each is upserted (existing tag reused by
	// slug, otherwise created) at save time. Omitted ⇒ tags left unchanged; passing it (even
	// empty) replaces the whole set.
	tagNames?: (string & tags.MinLength<1> & tags.MaxLength<100>)[];
}
