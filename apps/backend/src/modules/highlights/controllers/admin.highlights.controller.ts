import { wrap } from '@mikro-orm/core';

import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import { AdminBuildCityHighlightInputDto, AdminGetCityHighlightsInputDto } from '../dto/city-highlight.input.dto.js';
import {
	AdminCityHighlightMonthOutputDto,
	AdminCityHighlightOutputDto,
	AdminCityHighlightsOutputDto,
} from '../dto/city-highlight.output.dto.js';
import { CityHighlight } from '../entities/city-highlight.entity.js';
import { CityHighlightService } from '../services/city-highlight.service.js';

const highlightDto = (highlight: CityHighlight) =>
	wrap(highlight).serialize({
		skipNull: true,
		forceObject: true,
		populate: ['city'],
	}) as unknown as AdminCityHighlightOutputDto;

/**
 * The admin side of a city's public month (the Trends page's Highlights): preview a build,
 * publish it, take it down. The city's do-not-list is edited through `PATCH /admin/cities/:id`.
 */
@Controller('/admin/highlights')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminHighlightsController {
	constructor(private readonly cityHighlightService: CityHighlightService) {}

	/** The month as built (absent when it never was) and every built month of the city. */
	@TypedRoute.Get('/')
	async getCityHighlights(@TypedQuery() query: AdminGetCityHighlightsInputDto): Promise<AdminCityHighlightsOutputDto> {
		const [highlight, months] = [
			await this.cityHighlightService.find(query.cityId, query.month),
			await this.cityHighlightService.months(query.cityId),
		];
		return {
			...(highlight && { highlight: highlightDto(highlight) }),
			months: months.map(
				h =>
					wrap(h).serialize({ skipNull: true, forceObject: true, exclude: ['city', 'data'] }) as unknown as AdminCityHighlightMonthOutputDto,
			),
		};
	}

	/** Computes the month from what is stored now (corrections included) and keeps it for preview. */
	@TypedRoute.Post('/build')
	async buildCityHighlight(@TypedBody() body: AdminBuildCityHighlightInputDto): Promise<AdminCityHighlightOutputDto> {
		return highlightDto(await this.cityHighlightService.build(body.cityId, body.month));
	}

	/** Puts the month on the site and in the sitemap; 400 before the month is over. */
	@TypedRoute.Post('/:id/publish')
	async publishCityHighlight(@TypedParam('id') id: string & tags.Format<'uuid'>): Promise<AdminCityHighlightOutputDto> {
		return highlightDto(await this.cityHighlightService.publish(id));
	}

	@TypedRoute.Post('/:id/unpublish')
	async unpublishCityHighlight(@TypedParam('id') id: string & tags.Format<'uuid'>): Promise<AdminCityHighlightOutputDto> {
		return highlightDto(await this.cityHighlightService.unpublish(id));
	}
}
