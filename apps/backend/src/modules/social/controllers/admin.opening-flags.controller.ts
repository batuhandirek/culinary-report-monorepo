import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedRoute } from '@nestia/core';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import { AdminReflagOpeningsInputDto } from '../dto/admin-opening-flags.input.dto.js';
import { AdminReflagOpeningsOutputDto } from '../dto/admin-opening-flags.output.dto.js';
import { MentionExtractionService } from '../services/mention-extraction.service.js';

const DEFAULT_LIMIT = 100;

@Controller('/admin/mentions')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminOpeningFlagsController {
	constructor(private readonly mentionExtractionService: MentionExtractionService) {}

	/**
	 * Reads a month's stored posts again for the "just opened" flag only
	 * (`MentionExtractionService.reflagOpenings`): sets `isNewOpening` on the mentions already
	 * stored, adds none, and leaves matches and admins' corrections as they are. Most viewed first,
	 * `limit` posts a call (LLM allowance, ~3,000 tokens a post); call again with `nextOffset`
	 * until `remaining` is zero.
	 */
	@TypedRoute.Post('/reflag-openings')
	async reflagOpenings(
		@TypedBody() body: AdminReflagOpeningsInputDto,
	): Promise<AdminReflagOpeningsOutputDto> {
		const offset = body.offset ?? 0;
		const res = await this.mentionExtractionService.reflagOpenings({
			month: body.month,
			cityId: body.cityId,
			analysedBefore: body.analysedBefore ? new Date(body.analysedBefore) : undefined,
			onlyFlagged: body.onlyFlagged,
			limit: body.limit ?? DEFAULT_LIMIT,
			offset,
		});
		const nextOffset = offset + res.posts;
		return {
			read: res.read,
			failed: res.failed,
			flaggedMentions: res.flaggedMentions,
			flaggedPosts: res.flaggedPosts,
			cleared: res.cleared,
			unpaired: res.unpaired,
			tokens: res.tokens,
			nextOffset,
			remaining: Math.max(0, res.total - nextOffset),
		};
	}
}
