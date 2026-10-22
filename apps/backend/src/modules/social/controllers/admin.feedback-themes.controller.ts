import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedRoute } from '@nestia/core';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';
import { FeedbackThemeService } from 'src/modules/venues/services/feedback-theme.service.js';

import { AdminBackfillFeedbackThemesInputDto } from '../dto/admin-feedback-themes.input.dto.js';
import { AdminBackfillFeedbackThemesOutputDto } from '../dto/admin-feedback-themes.output.dto.js';
import { MentionExtractionService } from '../services/mention-extraction.service.js';

const DEFAULT_LIMIT = 500;

// In social, which imports venues: it files both reviews' points and mentions'
@Controller('/admin/feedback-themes')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminFeedbackThemesController {
	constructor(
		private readonly feedbackThemeService: FeedbackThemeService,
		private readonly mentionExtractionService: MentionExtractionService,
	) {}

	/**
	 * Files stored praise and complaint points that have no theme yet (extracted before themes
	 * existed) under one each, reading the phrases alone, so past months count by theme without
	 * re-extracting posts. Up to `limit` reviews and `limit` mentions a call, newest first; free
	 * (the LLM allowance). Call it again until `remaining` is zero.
	 */
	@TypedRoute.Post('/backfill')
	async backfillFeedbackThemes(
		@TypedBody() body: AdminBackfillFeedbackThemesInputDto,
	): Promise<AdminBackfillFeedbackThemesOutputDto> {
		const opts = { cityId: body.cityId, limit: body.limit ?? DEFAULT_LIMIT };
		const reviews = await this.feedbackThemeService.backfillReviews(opts);
		const mentions = await this.mentionExtractionService.backfillThemes(opts);
		return {
			reviews: reviews.reviews,
			mentions: mentions.mentions,
			points: reviews.points + mentions.points,
			remaining: {
				reviews: await this.feedbackThemeService.countUnthemedReviews(body.cityId),
				mentions: await this.mentionExtractionService.countUnthemed(body.cityId),
			},
		};
	}
}
