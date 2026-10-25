import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedQuery, TypedRoute } from '@nestia/core';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	AdminFileFeedbackThemesInputDto,
	AdminFileFeedbackThemesOutputDto,
	AdminRecheckDishLinksOutputDto,
	AdminWaitComplaintsInputDto,
	AdminWaitComplaintsOutputDto,
} from '../dto/admin-feedback.dto.js';
import { FeedbackService } from '../services/feedback.service.js';
import { FeedbackDishService } from '../services/feedback-dish.service.js';
import { FeedbackThemeService } from '../services/feedback-theme.service.js';

const THEMES_LIMIT = 600;

@Controller('/admin')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminFeedbackController {
	constructor(
		private readonly feedbackService: FeedbackService,
		private readonly feedbackThemeService: FeedbackThemeService,
		private readonly feedbackDishService: FeedbackDishService,
	) {}

	/**
	 * After the dish pass's instruction changed: its links whose phrase doesn't name the dish go
	 * back to the `feedback-dish-links` backlog, which looks at them again within the day's allowance.
	 */
	@TypedRoute.Post('/feedback/dish-links/recheck')
	async recheckDishLinks(): Promise<AdminRecheckDishLinksOutputDto> {
		const res = await this.feedbackDishService.recheckUnnamed();
		return { ...res, remaining: await this.feedbackDishService.countPending() };
	}

	/**
	 * After editing the vocabulary: `realign` (topics follow their theme, points of a removed theme
	 * go back to filing), then files up to `limit` unfiled points. Free (the LLM allowance). The
	 * daily LLM backlog `feedback-themes` files the rest on its own; this is for a city that can't wait.
	 */
	@TypedRoute.Post('/feedback-themes/backfill')
	async fileFeedbackThemes(
		@TypedBody() body: AdminFileFeedbackThemesInputDto,
	): Promise<AdminFileFeedbackThemesOutputDto> {
		const realigned = await this.feedbackService.realign();
		const filed = await this.feedbackThemeService.fileThemes({
			cityId: body.cityId,
			limit: body.limit ?? THEMES_LIMIT,
		});
		return {
			realigned,
			points: filed.points,
			remaining: await this.feedbackThemeService.countUnfiled(body.cityId),
		};
	}

	/** How many venues had a waiting complaint in the city's month, and how long the stated waits were */
	@TypedRoute.Get('/feedback/wait-complaints')
	async getWaitComplaints(
		@TypedQuery() query: AdminWaitComplaintsInputDto,
	): Promise<AdminWaitComplaintsOutputDto> {
		return this.feedbackService.waitComplaints(query.cityId, query.month);
	}
}
