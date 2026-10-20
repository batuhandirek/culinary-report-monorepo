import { PaginatedResult } from 'src/shared/interfaces/paginated-result.interface.js';

import { AdminBlogEntryOutputDto } from './admin-blog-entry.output.dto.js';

// Admin list omits the (potentially large) TipTap JSON body.
export interface AdminBlogEntryListItem extends Omit<AdminBlogEntryOutputDto, 'content'> {}

export interface AdminListBlogEntriesOutputDto extends PaginatedResult<AdminBlogEntryListItem> {}
