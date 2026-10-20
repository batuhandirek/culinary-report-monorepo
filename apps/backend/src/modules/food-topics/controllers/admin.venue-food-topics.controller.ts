import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedRoute } from '@nestia/core';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	AdminChangeVenueFoodTopicInputDto,
	AdminVenueFoodTopicsOutputDto,
} from '../dto/admin-venue-food-topics.dto.js';
import { FoodTopicService } from '../services/food-topic.service.js';
import { VenueFoodTopicService } from '../services/venue-food-topic.service.js';

@Controller('/admin/venues/:venueId/food-topics')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminVenueFoodTopicsController {
	constructor(
		private readonly venueFoodTopicService: VenueFoodTopicService,
		private readonly foodTopicService: FoodTopicService,
	) {}

	/** The venue's food topics, primary first, and the ones an admin keeps off it. */
	@TypedRoute.Get('/')
	async getVenueFoodTopics(
		@TypedParam('venueId') venueId: string,
	): Promise<AdminVenueFoodTopicsOutputDto> {
		return this.toDto(venueId);
	}

	/** Tags the venue with a topic, keeps one off it, or clears the admin's word on it. */
	@TypedRoute.Put('/:key')
	async changeVenueFoodTopic(
		@TypedParam('venueId') venueId: string,
		@TypedParam('key') key: string,
		@TypedBody() body: AdminChangeVenueFoodTopicInputDto,
	): Promise<AdminVenueFoodTopicsOutputDto> {
		await this.venueFoodTopicService.change(venueId, key, body.change);
		return this.toDto(venueId);
	}

	private async toDto(venueId: string): Promise<AdminVenueFoodTopicsOutputDto> {
		const [{ tags, excluded }, index] = await Promise.all([
			this.venueFoodTopicService.forVenue(venueId),
			this.foodTopicService.index(),
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
