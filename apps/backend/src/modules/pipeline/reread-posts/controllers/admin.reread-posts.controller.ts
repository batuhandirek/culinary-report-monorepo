import { Controller, UseGuards } from '@nestjs/common';

import { TypedParam, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';

import type { AdminPostRereadOutputDto } from '../dto/admin-post-reread.output.dto.js';
import { REREAD_POSTS_QUEUE } from '../queues/reread-posts.queue.js';
import { RereadPostsWorkflow } from '../workflows/reread-posts.workflow.js';

@Controller('/admin/posts')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminRereadPostsController {
	constructor(
		private readonly durable: DurableWorkflowsService,
		private readonly workflow: RereadPostsWorkflow,
	) {}

	/**
	 * "Re-analyse" on a post row: the gate and agent A read the post again (~3 agent calls, the
	 * post reading's own models), its mentions paired as the nightly re-read pairs them; one in
	 * flight per post. `high`: an admin waits on it.
	 */
	@TypedRoute.Post('/:id/reread')
	async rereadPost(@TypedParam('id') id: string & tags.Format<'uuid'>): Promise<AdminPostRereadOutputDto> {
		const handle = await this.durable.start(this.workflow.rereadPost, [id, true], {
			queue: REREAD_POSTS_QUEUE,
			dedupe: `by-hand-${id}`,
			onDuplicate: 'return-existing',
			priority: 'high',
			attributes: { purpose: 'reread-posts' },
		});
		return { workflowId: handle.workflowID };
	}
}
