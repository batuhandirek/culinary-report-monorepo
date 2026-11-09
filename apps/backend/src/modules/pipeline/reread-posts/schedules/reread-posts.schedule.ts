import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { DurableSchedule } from 'src/modules/durable-workflows/decorators/durable-schedule.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { MentionExtractionService } from 'src/modules/social/services/mention-extraction.service.js';
import { POSTS_GATED_AT } from 'src/modules/statements/constants/statements-shipped.constant.js';

import {
	REREAD_POSTS_CRON,
	REREAD_POSTS_PER_NIGHT,
	rereadPostRunId,
} from '../constants/reread-posts.constant.js';
import { REREAD_POSTS_QUEUE } from '../queues/reread-posts.queue.js';
import { RereadPostsWorkflow } from '../workflows/reread-posts.workflow.js';

/**
 * Nightly: the most viewed posts read before `POSTS_GATED_AT`, `REREAD_POSTS_PER_NIGHT` of them,
 * each started as its own `RereadPostsWorkflow.rereadPost` run (the user's yes to the spend,
 * 2026-11-02). Started, never awaited: each post governs itself.
 */
@Injectable()
export class RereadPostsSchedule {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly extraction: MentionExtractionService,
		private readonly workflow: RereadPostsWorkflow,
	) {}

	@DurableSchedule('reread-posts', REREAD_POSTS_CRON)
	@EnsureRequestContext()
	async nightly(): Promise<void> {
		const postIds = await this.durable.step('posts to re-read', () =>
			this.extraction.rereadPostIds(POSTS_GATED_AT, REREAD_POSTS_PER_NIGHT),
		);
		for (const postId of postIds)
			await this.durable.start(this.workflow.rereadPost, [postId], {
				queue: REREAD_POSTS_QUEUE,
				workflowId: rereadPostRunId(postId),
				attributes: { purpose: 'reread-posts' },
			});
	}
}
