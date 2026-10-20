import { tags } from 'typia';

export interface UpsertBlogTagInputDto {
	name: string & tags.MinLength<1> & tags.MaxLength<100>;

	// Optional; auto-derived from the name (deduplicated) when omitted.
	slug?: string & tags.MaxLength<100>;
}
