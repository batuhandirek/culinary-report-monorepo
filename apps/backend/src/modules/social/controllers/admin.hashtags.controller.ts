import { wrap } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import { AdminUpdateHashtagInputDto } from '../dto/admin-hashtags.input.dto.js';
import type { AdminHashtagOutputDto } from '../dto/admin-social.output.dto.js';
import { HashtagService } from '../services/hashtag.service.js';

@Controller('/admin/hashtags')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminHashtagsController {
	constructor(
		private readonly em: EntityManager,
		private readonly hashtagService: HashtagService,
	) {}

	/** Marks a tag as noise, so it is never suggested as a source, or takes that back. */
	@TypedRoute.Patch('/:id')
	async updateHashtag(
		@TypedParam('id') id: number & tags.Type<'uint32'>,
		@TypedBody() body: AdminUpdateHashtagInputDto,
	): Promise<AdminHashtagOutputDto> {
		const tag = await this.hashtagService.setIgnored(id, body.ignored);
		await this.em.populate(tag, ['topic', 'brand']);
		return wrap(tag).serialize({
			skipNull: true,
			forceObject: true,
			populate: ['topic', 'brand'],
			exclude: ['brand.branches'],
		}) as unknown as AdminHashtagOutputDto;
	}
}
