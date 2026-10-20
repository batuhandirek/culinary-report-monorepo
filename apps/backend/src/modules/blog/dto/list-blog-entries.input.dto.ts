import { QueryOrder } from '@mikro-orm/core';

import { PaginationRequest } from 'src/shared/interfaces/pagination-request.interface.js';

export type ListBlogEntriesSortKeys = 'publishedAt' | 'viewCount';
export type ListBlogEntriesSort = `${ListBlogEntriesSortKeys}:${QueryOrder.ASC | QueryOrder.DESC}`;

export interface ListBlogEntriesInputDto extends PaginationRequest {
	// Filter to entries carrying this tag (accepts the tag id or slug).
	tag?: string;
	// Free-text search over the title and body (case-insensitive substring).
	q?: string;
	// Ordering; defaults to `publishedAt:DESC` (newest first) when omitted.
	// `viewCount:DESC` powers the "Popular posts" section.
	sort?: ListBlogEntriesSort;
}
