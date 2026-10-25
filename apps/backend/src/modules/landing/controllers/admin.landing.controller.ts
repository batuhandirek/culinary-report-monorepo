import { wrap } from '@mikro-orm/core';

import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	AdminBuildLandingEditionInputDto,
	AdminLandingEditionsInputDto,
} from '../dto/landing.input.dto.js';
import {
	AdminLandingEditionOutputDto,
	AdminLandingEditionsOutputDto,
	AdminLandingEditionSummaryOutputDto,
} from '../dto/landing.output.dto.js';
import { LandingEdition } from '../entities/landing-edition.entity.js';
import { LandingEditionService } from '../services/landing-edition.service.js';

const editionDto = (edition: LandingEdition) =>
	wrap(edition).serialize({
		skipNull: true,
		forceObject: true,
		populate: ['city'],
	}) as unknown as AdminLandingEditionOutputDto;

/**
 * The admin side of the front page's live edition: the editions built (every five days by the
 * cron), a build now, and taking one down or putting it back.
 */
@Controller('/admin/landing-editions')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminLandingController {
	constructor(private readonly landingEditionService: LandingEditionService) {}

	/** The city's editions, newest first, and which one the page shows. */
	@TypedRoute.Get('/')
	async getLandingEditions(
		@TypedQuery() query: AdminLandingEditionsInputDto,
	): Promise<AdminLandingEditionsOutputDto> {
		const editions = await this.landingEditionService.list(query.cityId);
		const live = editions.find(e => e.publishedAt);
		return {
			editions: editions.map(
				e =>
					wrap(e).serialize({
						skipNull: true,
						forceObject: true,
						exclude: ['city', 'data', 'copy'],
					}) as unknown as AdminLandingEditionSummaryOutputDto,
			),
			...(live && { liveId: live.id }),
		};
	}

	@TypedRoute.Get('/:id')
	async getLandingEdition(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
	): Promise<AdminLandingEditionOutputDto> {
		return editionDto(await this.landingEditionService.get(id));
	}

	/** Queues a build of today's edition (it replaces one built earlier today and publishes itself). */
	@TypedRoute.Post('/build')
	async buildLandingEdition(@TypedBody() body: AdminBuildLandingEditionInputDto): Promise<void> {
		await this.landingEditionService.queueBuild(body.cityId);
	}

	@TypedRoute.Post('/:id/publish')
	async publishLandingEdition(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
	): Promise<AdminLandingEditionOutputDto> {
		return editionDto(await this.landingEditionService.publish(id));
	}

	/** Takes the edition off the page; the newest other published edition shows instead. */
	@TypedRoute.Post('/:id/unpublish')
	async unpublishLandingEdition(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
	): Promise<AdminLandingEditionOutputDto> {
		return editionDto(await this.landingEditionService.unpublish(id));
	}
}
