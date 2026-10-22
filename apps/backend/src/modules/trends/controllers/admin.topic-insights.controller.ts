import { Controller, UseGuards } from '@nestjs/common';

import { TypedParam, TypedQuery, TypedRoute } from '@nestia/core';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	AdminGetTopicInsightsInputDto,
	AdminTopicInsightOutputDto,
	AdminTopicInsightsOutputDto,
} from '../dto/admin-topic-insights.dto.js';
import { TopicInsightService } from '../services/topic-insight.service.js';

@Controller('/admin/topic-insights')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminTopicInsightsController {
	constructor(private readonly topicInsightService: TopicInsightService) {}

	/** The city's food topics with venues, the month's posts and Google searches, most posted about first. */
	@TypedRoute.Get('/')
	async getTopicInsights(
		@TypedQuery() query: AdminGetTopicInsightsInputDto,
	): Promise<AdminTopicInsightsOutputDto> {
		return this.topicInsightService.list(query.cityId, query.month);
	}

	/** One topic in the city: its figures, children, posts by month, related searches and venues. */
	@TypedRoute.Get('/:key')
	async getTopicInsight(
		@TypedParam('key') key: string,
		@TypedQuery() query: AdminGetTopicInsightsInputDto,
	): Promise<AdminTopicInsightOutputDto> {
		const d = await this.topicInsightService.detail(query.cityId, key, query.month);
		return {
			id: d.topic.id,
			row: d.row,
			aliases: d.topic.aliases,
			...(d.topic.trendsTopicId && { trendsTopicId: d.topic.trendsTopicId }),
			...(d.topic.trendsQuery && { trendsQuery: d.topic.trendsQuery }),
			...(d.parent && { parent: d.parent }),
			children: d.children,
			months: d.months,
			postsByMonth: d.postsByMonth,
			shareByMonth: d.shareByMonth,
			...(d.related && { related: d.related }),
			menu: d.menu,
			venues: d.venues.map(v => ({
				id: v.venue.id,
				name: v.venue.name,
				...(v.venue.district && { district: v.venue.district }),
				...(v.venue.category && { category: v.venue.category }),
				...(v.venue.rating != null && { rating: v.venue.rating }),
				...(v.venue.reviewsCount != null && { reviewsCount: v.venue.reviewsCount }),
				viaKey: v.viaKey,
				viaLabel: v.viaLabel,
				primary: v.primary,
				source: v.source,
				posts: v.posts,
			})),
		};
	}
}
