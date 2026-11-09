import type { tags } from 'typia';

export interface AdminSearchBrandInputDto {
	cityId: string & tags.Format<'uuid'>;
}
