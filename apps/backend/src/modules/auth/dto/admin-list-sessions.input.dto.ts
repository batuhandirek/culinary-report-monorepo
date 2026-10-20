import { Platform } from 'src/shared/constants/platform.enum.const.js';
import { PaginationRequest } from 'src/shared/interfaces/pagination-request.interface.js';

type AdminListSessionsSortField = 'createdAt' | 'lastSeenAt' | 'expiresAt';
type AdminListSessionsSortOrder = 'asc' | 'desc';
type AdminListSessionsFieldSort = `${AdminListSessionsSortField}:${AdminListSessionsSortOrder}`;

export interface AdminListSessionsInputDto extends PaginationRequest {
	sort?: AdminListSessionsFieldSort;
	// Restrict to a single user's sessions (used by the user-detail Sessions tab).
	userId?: string;
	platform?: Platform;
	// Only sessions that haven't expired yet.
	activeOnly?: boolean;
}
