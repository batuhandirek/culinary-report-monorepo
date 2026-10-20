import { QueryOrder } from '@mikro-orm/core';

import { tags } from 'typia';

import { PaginationRequest } from 'src/shared/interfaces/pagination-request.interface.js';

import { BlogEntryStateEnum } from '../constants/blog-entry-state.enum.constant.js';

export type AdminListBlogEntriesSortKeys = 'createdAt' | 'publishedAt' | 'title' | 'viewCount';
export type AdminListBlogEntriesSort =
	`${AdminListBlogEntriesSortKeys}:${QueryOrder.ASC | QueryOrder.DESC}`;

export interface AdminListBlogEntriesInputDto extends PaginationRequest {
	states?: BlogEntryStateEnum[] & tags.MinItems<1>;
	q?: string;
	tagId?: string & tags.Format<'uuid'>;
	sort?: AdminListBlogEntriesSort;
}
