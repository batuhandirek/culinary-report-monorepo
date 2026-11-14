import type { tags } from 'typia';

export interface AdminSearchBrandMenusInputDto {
	cityId: string & tags.Format<'uuid'>;
}
