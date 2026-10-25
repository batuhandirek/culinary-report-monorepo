import type { tags } from 'typia';

export interface AdminLandingEditionsInputDto {
	cityId: string & tags.Format<'uuid'>;
}

export interface AdminBuildLandingEditionInputDto {
	cityId: string & tags.Format<'uuid'>;
}
