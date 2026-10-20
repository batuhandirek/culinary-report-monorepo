import { PaginatedResult } from 'src/shared/interfaces/paginated-result.interface.js';

import { AdminSessionOutputDto } from './admin-session.output.dto.js';

export interface AdminListSessionsOutputDto extends PaginatedResult<AdminSessionOutputDto> {}
