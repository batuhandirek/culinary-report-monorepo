import { wrap } from '@mikro-orm/core';

import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	AdminFoodTrendsQuarterInputDto,
	AdminGetFoodTrendsInputDto,
} from '../dto/food-trends.input.dto.js';
import {
	AdminFoodTrendsOutputDto,
	AdminFoodTrendsQuarterOutputDto,
	AdminFoodTrendsReportOutputDto,
} from '../dto/food-trends.output.dto.js';
import { FoodTrendsReport } from '../entities/food-trends-report.entity.js';
import { FoodTrendsReportService } from '../services/food-trends-report.service.js';

const reportDto = (report: FoodTrendsReport) =>
	wrap(report).serialize({
		skipNull: true,
		forceObject: true,
		populate: ['city'],
	}) as unknown as AdminFoodTrendsReportOutputDto;

/**
 * The admin side of a city's quarterly food trends (Trends › Food trends report): pull the
 * anchored searches (paid), build from stored data, preview, publish, take it down.
 */
@Controller('/admin/food-trends')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminFoodTrendsController {
	constructor(private readonly foodTrendsReportService: FoodTrendsReportService) {}

	/** The quarter as stored (absent when nothing is), every stored quarter, and what a pull would cost. */
	@TypedRoute.Get('/')
	async getFoodTrends(
		@TypedQuery() query: AdminGetFoodTrendsInputDto,
	): Promise<AdminFoodTrendsOutputDto> {
		const [report, quarters, pull] = [
			await this.foodTrendsReportService.find(query.cityId, query.quarter),
			await this.foodTrendsReportService.quarters(query.cityId),
			await this.foodTrendsReportService
				.pullEstimate()
				.catch(() => ({ topics: 0, groups: 0, estimatedUsd: 0 })),
		];
		return {
			...(report && { report: reportDto(report) }),
			quarters: quarters.map(
				r =>
					wrap(r).serialize({
						skipNull: true,
						forceObject: true,
						exclude: ['city', 'data', 'searchPull'],
					}) as unknown as AdminFoodTrendsQuarterOutputDto,
			),
			pull,
		};
	}

	/** Queues the anchored Google Trends pull of the quarter (paid, about a cent a topic); 409 while one runs. */
	@TypedRoute.Post('/pull-searches')
	async pullFoodTrendsSearches(
		@TypedBody() body: AdminFoodTrendsQuarterInputDto,
	): Promise<AdminFoodTrendsReportOutputDto> {
		return reportDto(await this.foodTrendsReportService.queuePull(body.cityId, body.quarter));
	}

	/** Computes the quarter from what is stored now and keeps it for preview. Free. */
	@TypedRoute.Post('/build')
	async buildFoodTrends(
		@TypedBody() body: AdminFoodTrendsQuarterInputDto,
	): Promise<AdminFoodTrendsReportOutputDto> {
		return reportDto(await this.foodTrendsReportService.build(body.cityId, body.quarter));
	}

	/** Puts the quarter on the site and in the sitemap; 400 before it is built or over. */
	@TypedRoute.Post('/:id/publish')
	async publishFoodTrends(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
	): Promise<AdminFoodTrendsReportOutputDto> {
		return reportDto(await this.foodTrendsReportService.publish(id));
	}

	@TypedRoute.Post('/:id/unpublish')
	async unpublishFoodTrends(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
	): Promise<AdminFoodTrendsReportOutputDto> {
		return reportDto(await this.foodTrendsReportService.unpublish(id));
	}
}
