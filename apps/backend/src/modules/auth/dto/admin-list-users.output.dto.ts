import { AdminUserOutputDto } from 'src/modules/auth/dto/admin.user.output.dto.js';
import { PaginatedResult } from 'src/shared/interfaces/paginated-result.interface.js';

export interface AdminListUsersOutputDto extends PaginatedResult<AdminUserOutputDto> {}
