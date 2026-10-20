import { PaginatedResult } from 'src/shared/interfaces/paginated-result.interface.js';

import { BlogEntrySummaryOutputDto } from './blog-entry.output.dto.js';

export interface ListBlogEntriesOutputDto extends PaginatedResult<BlogEntrySummaryOutputDto> {}
