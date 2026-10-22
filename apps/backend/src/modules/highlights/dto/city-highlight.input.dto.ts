import { tags } from 'typia';

export type HighlightMonth = string & tags.Pattern<'^[0-9]{4}-(0[1-9]|1[0-2])$'>;

export interface AdminGetCityHighlightsInputDto {
	cityId: string & tags.Format<'uuid'>;
	month: HighlightMonth;
}

export interface AdminBuildCityHighlightInputDto {
	cityId: string & tags.Format<'uuid'>;
	month: HighlightMonth;
}
