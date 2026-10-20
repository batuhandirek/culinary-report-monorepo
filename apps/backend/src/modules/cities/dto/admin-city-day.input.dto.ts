import { tags } from 'typia';

import { CityEventKindEnum } from '../entities/city-event.entity.js';

type Day = string & tags.Pattern<'^\\d{4}-\\d{2}-\\d{2}$'>;

export interface AdminCityDaysQueryDto {
	from: Day;
	to: Day;
}

export interface AdminFillCityDaysInputDto {
	from: Day;
	to: Day;
}

export interface AdminCityContextQueryDto {
	month: string & tags.Pattern<'^\\d{4}-\\d{2}$'>;
}

export interface AdminAddCityEventInputDto {
	kind: CityEventKindEnum;
	name: string & tags.MinLength<1> & tags.MaxLength<120>;
	startDate: Day;
	endDate: Day;
}

export interface AdminUpdateCityEventInputDto extends Partial<AdminAddCityEventInputDto> {}
