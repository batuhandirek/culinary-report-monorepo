import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';

import _ from 'lodash';

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

	/** Every topic with the city's mentions and venues on it. */
	@TypedRoute.Get('/')
	async getTopics(
		@TypedQuery() query: AdminGetTopicsInputDto,
	): Promise<AdminTopicsOutputDto> {
		const { topics } = await this.topicService.overview(query.cityId);
		return {
			topics: topics.map(({ topic, mentions, venues, terms }) => ({
				...toDto(topic),
				mentions,
				venues,
				terms,
			})),
		};
	}

	/**
	 * Queues the re-link of everything stored against food topics (`TopicRelinkJob`: mentions,
	 * menu items, then every city's venue tags). A topic change queues it
	 * on its own; this is for a first fill or after a change made outside the admin.
	 */
	@TypedRoute.Post('/relink')
	async relinkTopics(): Promise<AdminRelinkTopicsOutputDto> {
		await this.topicService.queueRelink();
		return { queued: true };
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
		return toDto(await this.reloaded(await this.topicService.create(body)));
	}

	/** Changes the fields given; the key stays. Its wordings are terms (`PATCH /admin/terms/:id`). */
	@TypedRoute.Patch('/:id')
	async updateTopic(
		@TypedParam('id') id: string,
		@TypedBody() body: AdminUpdateTopicInputDto,
	): Promise<AdminTopicBaseOutputDto> {
		return toDto(await this.reloaded(await this.topicService.update(id, body)));
	}

	/** Deletes an aspect (400 for a kind of food, a root, or one with children); its claims move to its root. */
	@TypedRoute.Delete('/:id')
	async deleteTopic(@TypedParam('id') id: string): Promise<void> {
		await this.topicService.remove(id);
	}

	/** The topic as stored after a write, with its edges and the topics they point at */
	private async reloaded(topic: Topic): Promise<Topic> {
		return (await this.topicService.all()).find(t => t.id === topic.id) ?? topic;
	}
}

/** By hand: an edge is answered as the other topic's key, which no serializer gives */
const toDto = (topic: Topic): AdminTopicBaseOutputDto => {
	const edges = topic.edges
		.getItems()
		.filter(e => !e.to.deletedAt)
		.map(e => ({ to: e.to.key, type: e.type, rank: e.rank, decidedBy: e.decidedBy }));
	const parentKey = edges.find(e => e.type === 'is_a')?.to;
	return {
		id: topic.id,
		key: topic.key,
		label: topic.label,
		kind: topic.kind,
		...(parentKey && { parentKey }),
		edges: _.sortBy(edges, e => (e.type === 'is_a' ? 0 : 1), e => e.rank),
		...(topic.trendsTopicId && { trendsTopicId: topic.trendsTopicId }),
		...(topic.trendsQuery && { trendsQuery: topic.trendsQuery }),
		...(topic.hint && { hint: topic.hint }),
	};
};
