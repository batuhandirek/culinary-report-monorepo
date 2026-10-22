import { wrap } from '@mikro-orm/core';

import { Controller } from '@nestjs/common';

import { TypedParam, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { HighlightMonth } from '../dto/city-highlight.input.dto.js';
import { CityHighlightOutputDto } from '../dto/city-highlight.output.dto.js';
import { CityHighlightService } from '../services/city-highlight.service.js';

/** The public monthly page of a city, once an admin published it. */
@Controller('highlights')
export class HighlightsController {
	constructor(private readonly cityHighlightService: CityHighlightService) {}

	/** A published month of a city; 404 for an unknown city, an unbuilt or an unpublished month. */
	@TypedRoute.Get('/:citySlug/:month')
	async getCityHighlight(
		@TypedParam('citySlug') citySlug: string & tags.MaxLength<60>,
		@TypedParam('month') month: HighlightMonth,
	): Promise<CityHighlightOutputDto> {
		const highlight = await this.cityHighlightService.published(citySlug, month);
		return wrap(highlight).serialize({
			skipNull: true,
			forceObject: true,
			populate: ['city'],
		}) as unknown as CityHighlightOutputDto;
	}
}
