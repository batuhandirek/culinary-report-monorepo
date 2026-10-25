import { wrap } from '@mikro-orm/core';

import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';
import { ALL_FINDS_SINCE } from 'src/modules/social/util/post-sources.js';

import {
	AdminAddCitySourceInputDto,
	AdminCreateCityInputDto,
	AdminSuggestCitySourcesInputDto,
	AdminUpdateCityInputDto,
	AdminUpdateCitySourceInputDto,
} from '../dto/admin-city.input.dto.js';
import {
	AdminCityDistrictSuggestionsOutputDto,
	AdminCityHashtagSuggestionsOutputDto,
	AdminCityOutputDto,
	AdminCitySourceOutputDto,
	AdminListCitiesOutputDto,
	AdminListCitySourcesOutputDto,
	AdminSuggestCitySourcesOutputDto,
} from '../dto/admin-city.output.dto.js';
import { City } from '../entities/city.entity.js';
import { CitySource } from '../entities/city-source.entity.js';
import { CityService } from '../services/city.service.js';
import { CitySuggestionService } from '../services/city-suggestion.service.js';

const cityDto = (city: City) =>
	wrap(city).serialize({ skipNull: true, forceObject: true }) as unknown as AdminCityOutputDto;

const sourceDto = (source: CitySource) =>
	wrap(source).serialize({
		skipNull: true,
		forceObject: true,
		exclude: ['city'],
	}) as unknown as AdminCitySourceOutputDto;

@Controller('/admin/cities')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminCitiesController {
	constructor(
		private readonly cityService: CityService,
		private readonly citySuggestionService: CitySuggestionService,
	) {}

	/** Every city with its venue and source counts, by name. */
	@TypedRoute.Get('/')
	async listCities(): Promise<AdminListCitiesOutputDto> {
		const [cities, counts] = await Promise.all([this.cityService.list(), this.cityService.counts()]);
		return {
			items: cities.map(city => ({
				...(wrap(city).serialize({
					skipNull: true,
					forceObject: true,
				}) as unknown as AdminCityOutputDto),
				venues: 0,
				sources: 0,
				enabledSources: 0,
				...counts.get(city.id),
			})),
		};
	}

	@TypedRoute.Get('/:id')
	async getCity(@TypedParam('id') id: string & tags.Format<'uuid'>): Promise<AdminCityOutputDto> {
		return cityDto(await this.cityService.getById(id));
	}

	@TypedRoute.Post('/')
	async createCity(@TypedBody() body: AdminCreateCityInputDto): Promise<AdminCityOutputDto> {
		return cityDto(
			await this.cityService.create({
				aliases: [],
				instagramEnabled: true,
				districts: [],
				nameStopwords: [],
				chainDenyList: [],
				stepBudgetsUsd: {},
				topBrands: 20,
				cronEnabled: false,
				active: true,
				...body,
			}),
		);
	}

	@TypedRoute.Patch('/:id')
	async updateCity(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedBody() body: AdminUpdateCityInputDto,
	): Promise<AdminCityOutputDto> {
		return cityDto(await this.cityService.update(id, body));
	}

	/** The city's sources with their yield over the last three months. */
	@TypedRoute.Get('/:id/sources')
	async listCitySources(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
	): Promise<AdminListCitySourcesOutputDto> {
		const rows = await this.cityService.sourceYield(id);
		return {
			items: rows.map(({ source, ...numbers }) => ({ ...sourceDto(source), ...numbers })),
			allFindsSince: ALL_FINDS_SINCE,
		};
	}

	/**
	 * Tags the city doesn't scrape that keep coming up on its matched posts (three months, 3+
	 * brands, 5+ posts): candidates to add, from the data, free. Nothing is saved.
	 */
	@TypedRoute.Get('/:id/hashtag-suggestions')
	async listCityHashtagSuggestions(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
	): Promise<AdminCityHashtagSuggestionsOutputDto> {
		return { items: await this.cityService.hashtagSuggestions(id) };
	}

	@TypedRoute.Post('/:id/sources')
	async addCitySource(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedBody() body: AdminAddCitySourceInputDto,
	): Promise<AdminCitySourceOutputDto> {
		return sourceDto(await this.cityService.addSource(id, body));
	}

	/**
	 * Asks the LLM for hashtags and searches (one call) and adds them as disabled, `suggested`
	 * sources for review; ones the city already has are skipped.
	 */
	@TypedRoute.Post('/:id/suggest-sources')
	async suggestCitySources(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedBody() body: AdminSuggestCitySourcesInputDto,
	): Promise<AdminSuggestCitySourcesOutputDto> {
		const { added, skipped } = await this.citySuggestionService.suggestSources(id, body);
		return { items: added.map(sourceDto), skipped };
	}

	/** Districts with postal codes as the city's venues place them; nothing is saved. */
	@TypedRoute.Get('/:id/district-suggestions')
	async listCityDistrictSuggestions(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
	): Promise<AdminCityDistrictSuggestionsOutputDto> {
		return { items: await this.citySuggestionService.suggestDistricts(id) };
	}

	/** Enables or disables a source (which reviews a suggestion), or edits its note. */
	@TypedRoute.Patch('/:id/sources/:sourceId')
	async updateCitySource(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedParam('sourceId') sourceId: string & tags.Format<'uuid'>,
		@TypedBody() body: AdminUpdateCitySourceInputDto,
	): Promise<AdminCitySourceOutputDto> {
		return sourceDto(await this.cityService.updateSource(id, sourceId, body));
	}
}
