import { tags } from 'typia';

/** A calendar quarter, `YYYY-qN` (`2026-q3`). */
export type FoodTrendsQuarter = string & tags.Pattern<'^[0-9]{4}-q[1-4]$'>;

export interface AdminGetFoodTrendsInputDto {
	cityId: string & tags.Format<'uuid'>;
	quarter: FoodTrendsQuarter;
}

export interface AdminFoodTrendsQuarterInputDto {
	cityId: string & tags.Format<'uuid'>;
	quarter: FoodTrendsQuarter;
}
