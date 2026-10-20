import { tags } from 'typia';

import type { CityTrends } from '../interfaces/city-trends.interface.js';

export interface AdminGetTrendsInputDto {
	month: string & tags.Pattern<'^[0-9]{4}-[0-9]{2}$'>;
	cityId: string & tags.Format<'uuid'>;
}

export interface AdminTrendsOutputDto extends CityTrends {}
