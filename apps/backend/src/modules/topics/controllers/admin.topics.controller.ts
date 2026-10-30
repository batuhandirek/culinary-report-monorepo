import { wrap } from '@mikro-orm/core';

import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	AdminRelinkTopicsOutputDto,
	AdminCreateTopicInputDto,
	AdminTopicBaseOutputDto,
	AdminTopicsOutputDto,
	AdminGetTopicsInputDto,
	AdminIgnoreWordInputDto,
	AdminTrendsLookupInputDto,
	AdminTrendsLookupOutputDto,
	AdminUpdateTopicInputDto,
} from '../dto/admin-topics.dto.js';
import { Topic } from '../entities/topic.entity.js';
import { TopicService } from '../services/topic.service.js';
import { TrendsTopicLookupService } from '../services/trends-topic-lookup.service.js';

@Controller('/admin/topics')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminTopicsController {
	constructor(
		private readonly topicService: TopicService,
		private readonly trendsTopicLookupService: TrendsTopicLookupService,
	) {}

	/** Every food topic with the city's mentions and venues on it, and the city's unmapped cuisine keys. */
	@TypedRoute.Get('/')
	async getTopics(
		@TypedQuery() query: AdminGetTopicsInputDto,
	): Promise<AdminTopicsOutputDto> {
		const { topics, unmapped, ignored } = await this.topicService.overview(query.cityId);
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
	 * Queues the re-link of everything stored against food topics (`TopicRelinkJob`: mentions,
	 * menu items, feedback dishes, then every city's venue tags). A topic or alias change queues it
	 * on its own; this is for a first fill or after a change made outside the admin.
	 */
	@TypedRoute.Post('/relink')
	async relinkTopics(): Promise<AdminRelinkTopicsOutputDto> {
		await this.topicService.queueRelink();
		return { queued: true };
	}

	@TypedRoute.Put('/ignored-words')
	async setIgnoredWord(@TypedBody() body: AdminIgnoreWordInputDto): Promise<void> {
		await this.topicService.setIgnored(body.word, body.ignored);
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
	async createTopic(
		@TypedBody() body: AdminCreateTopicInputDto,
	): Promise<AdminTopicBaseOutputDto> {
		const topic = await this.topicService.create(body);
		return toDto(topic, await this.keysById());
	}

	/** Changes the fields given; an unmapped key is mapped by adding it to `aliases`. */
	@TypedRoute.Patch('/:id')
	async updateTopic(
		@TypedParam('id') id: string,
		@TypedBody() body: AdminUpdateTopicInputDto,
	): Promise<AdminTopicBaseOutputDto> {
		const topic = await this.topicService.update(id, body);
		return toDto(topic, await this.keysById());
	}

	/** Deletes an aspect (400 for a kind of food, a root, or one with children); its points move to its parent. */
	@TypedRoute.Delete('/:id')
	async deleteTopic(@TypedParam('id') id: string): Promise<void> {
		await this.topicService.remove(id);
	}

	private async keysById(): Promise<Map<string, string>> {
		return new Map((await this.topicService.all()).map(t => [t.id, t.key]));
	}
}

const toDto = (topic: Topic, keyById: Map<string, string>): AdminTopicBaseOutputDto => {
	const parentKey = topic.parent ? keyById.get(topic.parent.id) : undefined;
	return {
		...(wrap(topic).serialize({
			skipNull: true,
			forceObject: true,
		}) as unknown as AdminTopicBaseOutputDto),
		...(parentKey && { parentKey }),
	};
};
