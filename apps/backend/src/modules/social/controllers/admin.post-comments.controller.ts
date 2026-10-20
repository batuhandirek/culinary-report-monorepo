import { wrap } from '@mikro-orm/core';

import { Controller, UseGuards } from '@nestjs/common';

import { TypedParam, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	AdminPostCommentOutputDto,
	AdminPostCommentsOutputDto,
} from '../dto/admin-post-comment.output.dto.js';
import { PostCommentService } from '../services/post-comment.service.js';

/** The comments under a post, on the admin post page. */
@Controller('/admin/posts/:id/comments')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminPostCommentsController {
	constructor(private readonly postCommentService: PostCommentService) {}

	@TypedRoute.Get('/')
	async listPostComments(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
	): Promise<AdminPostCommentsOutputDto> {
		const { post, comments } = await this.postCommentService.listForPost(id);
		return {
			...(post.commentsScrapedAt && { scrapedAt: post.commentsScrapedAt.toISOString() }),
			...(post.commentsDisagreement && { disagreement: post.commentsDisagreement }),
			comments: comments.map(
				c =>
					wrap(c).serialize({ skipNull: true, forceObject: true }) as unknown as AdminPostCommentOutputDto,
			),
		};
	}
}
