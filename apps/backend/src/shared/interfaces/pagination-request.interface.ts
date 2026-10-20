import typia from 'typia';

export interface PaginationRequest {
	page: number & typia.tags.Minimum<1>;

	size: number & typia.tags.Minimum<1>;
}
