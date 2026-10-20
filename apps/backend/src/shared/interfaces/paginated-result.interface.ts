export interface PaginatedResult<T> {
	items: T[];
	totalItems: number;
	pageSize: number;
	page: number;
}
