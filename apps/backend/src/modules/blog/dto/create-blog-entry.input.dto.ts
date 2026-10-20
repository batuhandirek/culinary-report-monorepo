import { tags } from 'typia';

export interface CreateBlogEntryInputDto {
	title: string & tags.MinLength<1> & tags.MaxLength<300>;

	// Stringified TipTap JSON document from the WYSIWYG editor.
	content: string;

	excerpt?: string & tags.MaxLength<600>;

	// Note: slug is always auto-derived from the title (deduplicated); not client-settable.

	// Cover image as a data URL (`data:image/...;base64,...`); uploaded to storage on save.
	coverImage?: string;

	// Tag names to associate with the entry; each is upserted (existing tag reused by slug,
	// otherwise created) at save time. This is how the admin editor adds tags on demand without
	// a separate create-tag round-trip.
	tagNames?: (string & tags.MinLength<1> & tags.MaxLength<100>)[];
}
