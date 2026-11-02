import { Controller, UseGuards } from '@nestjs/common';

import { TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	AdminDigestedPostOutputDto,
	AdminDigestedReviewOutputDto,
	AdminDigestionInputDto,
	AdminDigestionOutputDto,
} from '../dto/admin-digestion.dto.js';
import { DigestionService } from '../services/digestion.service.js';

/** Admin → Digestion: every review and post, and what the ingestion pipeline made of each. Reads only. */
@Controller('/admin/digestion')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminDigestionController {
	constructor(private readonly digestionService: DigestionService) {}

	/** Reviews and posts newest first, filtered, each with its status and counts */
	@TypedRoute.Get()
	async listDigestion(
		@TypedQuery() query: AdminDigestionInputDto,
	): Promise<AdminDigestionOutputDto> {
		return this.digestionService.list(query);
	}

	/** A post and every step over it: the gate, agent A's places (with their matches) and claims, agent B's parts */
	@TypedRoute.Get('/posts/:id')
	async getDigestedPost(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
	): Promise<AdminDigestedPostOutputDto> {
		return this.digestionService.post(id);
	}

	/** A review and what agents A and B made of it */
	@TypedRoute.Get('/reviews/:id')
	async getDigestedReview(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
	): Promise<AdminDigestedReviewOutputDto> {
		return this.digestionService.review(id);
	}
}
