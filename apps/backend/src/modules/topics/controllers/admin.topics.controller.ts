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
	AdminTrendsLookupInputDto,
	AdminTrendsLookupOutputDto,
	AdminUpdateTopicInputDto,
} from '../dto/admin-topics.dto.js';
import { Topic } from '../entities/topic.entity.js';
import { TermService } from '../services/term.service.js';
import { TopicService } from '../services/topic.service.js';
import { TrendsTopicLookupService } from '../services/trends-topic-lookup.service.js';

@Controller('/admin/topics')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminTopicsController {
	constructor(
		private readonly topicService: TopicService,
		private readonly termService: TermService,
		private readonly trendsTopicLookupService: TrendsTopicLookupService,
	) {}

	/** Every topic with the city's mentions and venues on it. */
	@TypedRoute.Get('/')
	async getTopics(
		@TypedQuery() query: AdminGetTopicsInputDto,
	): Promise<AdminTopicsOutputDto> {
		const { topics } = await this.topicService.overview(query.cityId);
		const keyById = new Map(topics.map(({ topic }) => [topic.id, topic.key]));
		const aliases = await this.termService.aliasesOf(topics.map(({ topic }) => topic.id));
		return {
			topics: topics.map(({ topic, mentions, venues }) => ({
				...toDto(topic, keyById, aliases.get(topic.id) ?? []),
				mentions,
				venues,
			})),
		};
	}

	/**
	 * Queues the re-link of everything stored against food topics (`TopicRelinkJob`: mentions,
	 * menu items, then every city's venue tags). A topic or alias change queues it
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

	/** A new topic; 409 when its key exists. Its `aliases` become admin terms linked to it. */
	@TypedRoute.Post('/')
	async createTopic(
		@TypedBody() body: AdminCreateTopicInputDto,
	): Promise<AdminTopicBaseOutputDto> {
		const { aliases, ...input } = body;
		const topic = await this.topicService.create(input);
		if (aliases?.length) await this.termService.setAliases(topic, aliases);
		return toDto(topic, await this.keysById(), (await this.termService.aliasesOf([topic.id])).get(topic.id) ?? []);
	}

	/** Changes the fields given; `aliases` are the topic's other names (admin terms linked to it alone). */
	@TypedRoute.Patch('/:id')
	async updateTopic(
		@TypedParam('id') id: string,
		@TypedBody() body: AdminUpdateTopicInputDto,
	): Promise<AdminTopicBaseOutputDto> {
		const { aliases, ...input } = body;
		const topic = await this.topicService.update(id, input);
		if (aliases !== undefined) await this.termService.setAliases(topic, aliases);
		return toDto(topic, await this.keysById(), (await this.termService.aliasesOf([topic.id])).get(topic.id) ?? []);
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

const toDto = (topic: Topic, keyById: Map<string, string>, aliases: string[]): AdminTopicBaseOutputDto => {
	const parentKey = topic.parent ? keyById.get(topic.parent.id) : undefined;
	return {
		...(wrap(topic).serialize({
			skipNull: true,
			forceObject: true,
		}) as unknown as AdminTopicBaseOutputDto),
		aliases,
		...(parentKey && { parentKey }),
	};
};
