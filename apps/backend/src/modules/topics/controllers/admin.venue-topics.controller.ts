import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedRoute } from '@nestia/core';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	AdminChangeVenueTopicInputDto,
	AdminVenueTopicsOutputDto,
} from '../dto/admin-venue-topics.dto.js';
import { TopicService } from '../services/topic.service.js';
import { VenueTopicService } from '../services/venue-topic.service.js';

@Controller('/admin/venues/:venueId/topics')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminVenueTopicsController {
	constructor(
		private readonly venueTopicService: VenueTopicService,
		private readonly topicService: TopicService,
	) {}

	/** The venue's food topics, primary first, and the ones an admin keeps off it. */
	@TypedRoute.Get('/')
	async getVenueTopics(
		@TypedParam('venueId') venueId: string,
	): Promise<AdminVenueTopicsOutputDto> {
		return this.toDto(venueId);
	}

	/** Tags the venue with a topic, keeps one off it, or clears the admin's word on it. */
	@TypedRoute.Put('/:key')
	async changeVenueTopic(
		@TypedParam('venueId') venueId: string,
		@TypedParam('key') key: string,
		@TypedBody() body: AdminChangeVenueTopicInputDto,
	): Promise<AdminVenueTopicsOutputDto> {
		await this.venueTopicService.change(venueId, key, body.change);
		return this.toDto(venueId);
	}

	private async toDto(venueId: string): Promise<AdminVenueTopicsOutputDto> {
		const [{ tags, excluded }, index] = await Promise.all([
			this.venueTopicService.forVenue(venueId),
			this.topicService.index(),
		]);
		return {
			tags: tags.map(t => ({
				...t,
				label: index.get(t.key)!.label,
				kind: index.get(t.key)!.kind,
			})),
			excluded: excluded.map(key => ({ key, label: index.get(key)?.label ?? key })),
		};
	}
}
