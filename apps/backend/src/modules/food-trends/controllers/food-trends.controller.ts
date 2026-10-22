import { wrap } from '@mikro-orm/core';

import { Controller } from '@nestjs/common';

import { TypedParam, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { FoodTrendsQuarter } from '../dto/food-trends.input.dto.js';
import { FoodTrendsReportOutputDto } from '../dto/food-trends.output.dto.js';
import { FoodTrendsReportService } from '../services/food-trends-report.service.js';

/** The public quarterly food trends page of a city, once an admin published it. */
@Controller('food-trends')
export class FoodTrendsController {
	constructor(private readonly foodTrendsReportService: FoodTrendsReportService) {}

	/** A published quarter of a city; 404 for an unknown city, an unbuilt or an unpublished quarter. */
	@TypedRoute.Get('/:citySlug/:quarter')
	async getFoodTrendsReport(
		@TypedParam('citySlug') citySlug: string & tags.MaxLength<60>,
		@TypedParam('quarter') quarter: FoodTrendsQuarter,
	): Promise<FoodTrendsReportOutputDto> {
		const report = await this.foodTrendsReportService.published(citySlug, quarter);
		return wrap(report).serialize({
			skipNull: true,
			forceObject: true,
			populate: ['city'],
			exclude: ['searchPull'],
		}) as unknown as FoodTrendsReportOutputDto;
	}
}
