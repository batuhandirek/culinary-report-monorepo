export type PaginationArg = { size: number; page: number; sort: string };
export type PaginationResult<T> = {
	items: T[];
	page: number;
	pageSize: number;
	totalItems: number;
};
export type PaginatedApi<T = unknown> = (args: PaginationArg) => Promise<PaginationResult<T>>;
export type ItemOfPaginatedApi<A extends PaginatedApi> = Awaited<ReturnType<A>>['items'][0];
