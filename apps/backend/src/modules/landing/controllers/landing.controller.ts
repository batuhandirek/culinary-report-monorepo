import { wrap } from '@mikro-orm/core';

import { Controller } from '@nestjs/common';

import { TypedParam, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { LandingEditionOutputDto } from '../dto/landing.output.dto.js';
import { LandingEditionService } from '../services/landing-edition.service.js';

/** The front page's live edition of a city, public. */
@Controller('landing')
export class LandingController {
	constructor(private readonly landingEditionService: LandingEditionService) {}

	/** The newest published edition of the city; 404 for an unknown city or one without any. */
	@TypedRoute.Get('/:citySlug')
	async getLandingEdition(
		@TypedParam('citySlug') citySlug: string & tags.MaxLength<60>,
	): Promise<LandingEditionOutputDto> {
		const edition = await this.landingEditionService.published(citySlug);
		return wrap(edition).serialize({
			skipNull: true,
			forceObject: true,
			populate: ['city'],
		}) as unknown as LandingEditionOutputDto;
	}
}
