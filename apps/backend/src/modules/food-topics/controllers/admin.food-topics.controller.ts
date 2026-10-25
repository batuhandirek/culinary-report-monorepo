import { wrap } from '@mikro-orm/core';

import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	AdminRelinkFoodTopicsOutputDto,
	AdminCreateFoodTopicInputDto,
	AdminFoodTopicBaseOutputDto,
	AdminFoodTopicsOutputDto,
	AdminGetFoodTopicsInputDto,
	AdminIgnoreWordInputDto,
	AdminTrendsLookupInputDto,
	AdminTrendsLookupOutputDto,
	AdminUpdateFoodTopicInputDto,
} from '../dto/admin-food-topics.dto.js';
import { FoodTopic } from '../entities/food-topic.entity.js';
import { FoodTopicService } from '../services/food-topic.service.js';
import { TrendsTopicLookupService } from '../services/trends-topic-lookup.service.js';

@Controller('/admin/food-topics')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminFoodTopicsController {
	constructor(
		private readonly foodTopicService: FoodTopicService,
		private readonly trendsTopicLookupService: TrendsTopicLookupService,
	) {}

	/** Every food topic with the city's mentions and venues on it, and the city's unmapped cuisine keys. */
	@TypedRoute.Get('/')
	async getFoodTopics(
		@TypedQuery() query: AdminGetFoodTopicsInputDto,
	): Promise<AdminFoodTopicsOutputDto> {
		const { topics, unmapped, ignored } = await this.foodTopicService.overview(query.cityId);
		const keyById = new Map(topics.map(({ topic }) => [topic.id, topic.key]));
		return {
			topics: topics.map(({ topic, mentions, venues }) => ({
				...toDto(topic, keyById),
				mentions,
				venues,
			})),
			unmapped,
			ignored,
		};
	}

	/** Dismisses an unrecognised word (no kind of food to map), or brings it back. */
	/**
	 * Queues the re-link of everything stored against food topics (`FoodTopicRelinkJob`: mentions,
	 * menu items, feedback dishes, then every city's venue tags). A topic or alias change queues it
	 * on its own; this is for a first fill or after a change made outside the admin.
	 */
	@TypedRoute.Post('/relink')
	async relinkFoodTopics(): Promise<AdminRelinkFoodTopicsOutputDto> {
		await this.foodTopicService.queueRelink();
		return { queued: true };
	}

	@TypedRoute.Put('/ignored-words')
	async setIgnoredWord(@TypedBody() body: AdminIgnoreWordInputDto): Promise<void> {
		await this.foodTopicService.setIgnored(body.word, body.ignored);
	}

	/** Google Trends topic ids for some words (Trends' autocomplete), to set a topic's `trendsTopicId`. */
	@TypedRoute.Get('/trends-lookup')
	async lookupTrendsTopics(
		@TypedQuery() query: AdminTrendsLookupInputDto,
	): Promise<AdminTrendsLookupOutputDto> {
		return { topics: await this.trendsTopicLookupService.lookup(query.q) };
	}

	/** A new topic; 409 when its key exists. */
	@TypedRoute.Post('/')
	async createFoodTopic(
		@TypedBody() body: AdminCreateFoodTopicInputDto,
	): Promise<AdminFoodTopicBaseOutputDto> {
		const topic = await this.foodTopicService.create(body);
		return toDto(topic, await this.keysById());
	}

	/** Changes the fields given; an unmapped key is mapped by adding it to `aliases`. */
	@TypedRoute.Patch('/:id')
	async updateFoodTopic(
		@TypedParam('id') id: string,
		@TypedBody() body: AdminUpdateFoodTopicInputDto,
	): Promise<AdminFoodTopicBaseOutputDto> {
		const topic = await this.foodTopicService.update(id, body);
		return toDto(topic, await this.keysById());
	}

	private async keysById(): Promise<Map<string, string>> {
		return new Map((await this.foodTopicService.all()).map(t => [t.id, t.key]));
	}
}

const toDto = (topic: FoodTopic, keyById: Map<string, string>): AdminFoodTopicBaseOutputDto => {
	const parentKey = topic.parent ? keyById.get(topic.parent.id) : undefined;
	return {
		...(wrap(topic).serialize({
			skipNull: true,
			forceObject: true,
		}) as unknown as AdminFoodTopicBaseOutputDto),
		...(parentKey && { parentKey }),
	};
};
