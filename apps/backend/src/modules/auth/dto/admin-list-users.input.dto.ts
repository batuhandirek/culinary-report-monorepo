import { PaginationRequest } from 'src/shared/interfaces/pagination-request.interface.js';

type AdminListUsersInputDtoSortField = 'createdAt' | 'firstName';
type AdminListUsersInputDtoSortOrder = 'asc' | 'desc';
type AdminListUsersInputDtoFieldSort =
	`${AdminListUsersInputDtoSortField}:${AdminListUsersInputDtoSortOrder}`;

export interface AdminListUsersInputDto extends PaginationRequest {
	sort?: AdminListUsersInputDtoFieldSort;
	q?: string;
	isMarkedForDeletion?: boolean;
}
