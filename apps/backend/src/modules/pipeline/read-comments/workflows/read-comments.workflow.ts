import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import type { WorkflowHandle } from '@dbos-inc/dbos-sdk';

import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { DurableLlmService } from 'src/modules/llm/services/durable-llm.service.js';
import { withLlmCallContext } from 'src/modules/llm/util/llm-call-context.js';
import type { DurableGenerateResult } from 'src/modules/llm/workflows/llm.workflow.js';
import {
	type CommentIntentFields,
	type CommentsForReading,
	type DisagreeingComments,
	PostCommentService,
} from 'src/modules/social/services/post-comment.service.js';

import { CommentDisagreementAgent } from '../agents/comment-disagreement.agent.js';
import { CommentIntentAgent, type CommentIntentAnswer } from '../agents/comment-intent.agent.js';
import {
	READ_COMMENTS_POSTS_PER_RUN,
	readCommentsWorkflowId,
} from '../constants/read-comments.constant.js';
import { READ_COMMENTS_CITY_QUEUE, READ_COMMENTS_QUEUE } from '../queues/read-comments.queue.js';
import { commentDisagreementMessage, commentIntentMessage } from '../util/comment-messages.js';

/** What reading one post's comments did */
export interface ReadCommentsResult {
	/** Comments read, those the agent was asked about among them */
	read: number;
	asked: number;
	/** Whether its disagreeing comments got their sentence */
	disagreement: boolean;
}

/** What a city's run did: posts started, read, and failed (each waits for an admin) */
export interface ReadCommentsCityResult {
	posts: number;
	comments: number;
	failed: number;
}

/**
 * The reading of the comments under the report venues' top posts: one workflow per post. Tags-
 * only and emoji-only comments need no model (`plainIntent`); every other comment is one
 * `CommentIntentAgent` call, each a child that waits until an account can serve it, all started
 * before any answer is awaited; then, when some disagree, one `CommentDisagreementAgent` call for
 * the post's sentence on what they say.
 */
@Injectable()
export class ReadCommentsWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly durableLlm: DurableLlmService,
		private readonly postCommentService: PostCommentService,
		private readonly intentAgent: CommentIntentAgent,
		private readonly disagreementAgent: CommentDisagreementAgent,
	) {}

	@DurableWorkflow({ name: 'read-comments.city' })
	@EnsureRequestContext()
	async readCity(cityId: string): Promise<ReadCommentsCityResult> {
		const postIds = await this.postsToRead(cityId);
		const handles: WorkflowHandle<ReadCommentsResult>[] = [];
		for (const postId of postIds)
			handles.push(
				await this.durable.start(this.readPost, [postId], {
					queue: READ_COMMENTS_QUEUE,
					workflowId: readCommentsWorkflowId(postId),
					attributes: { cityId, purpose: 'read-comments' },
				}),
			);
		const result = { posts: postIds.length, comments: 0, failed: 0 };
		for (const handle of handles) {
			const done = await handle.getResult().catch(() => null);
			if (done) result.comments += done.read;
			else result.failed++;
		}
		return result;
	}

	@DurableWorkflow({ name: 'read-comments.post' })
	@EnsureRequestContext()
	async readPost(postId: string): Promise<ReadCommentsResult> {
		const post = await this.plan(postId);
		if (!post) return { read: 0, asked: 0, disagreement: false };
		return withLlmCallContext({ cityId: post.cityId, purpose: 'read-comments' }, () =>
			this.read(post),
		);
	}

	private async read(post: CommentsForReading): Promise<ReadCommentsResult> {
		const context = { cityName: post.cityName };

		// 1. Every comment a model must read: one call each, all started, then awaited in order
		const handles: WorkflowHandle<DurableGenerateResult<CommentIntentAnswer>>[] = [];
		for (const comment of post.ask)
			handles.push(
				await this.durableLlm.start(
					this.intentAgent,
					commentIntentMessage(post, comment),
					context,
				),
			);
		const answers: { commentId: string; answer: CommentIntentFields }[] = [];
		for (const [index, handle] of handles.entries())
			answers.push({
				commentId: post.ask[index].commentId,
				answer: (await handle.getResult()).object,
			});
		const disagreeing = await this.saveIntents(post.postId, post.plain, answers);

		// 2. What the disagreeing ones say, in one sentence
		if (disagreeing) {
			const res = await this.durableLlm.generate(
				this.disagreementAgent,
				commentDisagreementMessage(disagreeing),
				context,
			);
			await this.saveDisagreement(post.postId, res.object.summary);
		}
		return {
			read: post.plain.length + answers.length,
			asked: answers.length,
			disagreement: !!disagreeing,
		};
	}

	@DurableStep({ name: 'posts to read' })
	private async postsToRead(cityId: string): Promise<string[]> {
		return this.postCommentService.postsWithUnreadComments(cityId, READ_COMMENTS_POSTS_PER_RUN);
	}

	/** The post's unread comments as the agent reads them; none when every one is read */
	@DurableStep({ name: 'plan' })
	private async plan(postId: string): Promise<CommentsForReading | null> {
		return this.postCommentService.commentsForReading(postId);
	}

	@DurableStep({ name: 'save intents' })
	private async saveIntents(
		postId: string,
		plain: CommentsForReading['plain'],
		answers: { commentId: string; answer: CommentIntentFields }[],
	): Promise<DisagreeingComments | null> {
		return this.postCommentService.saveCommentIntents(postId, plain, answers);
	}

	@DurableStep({ name: 'save disagreement' })
	private async saveDisagreement(postId: string, summary: string): Promise<void> {
		await this.postCommentService.saveDisagreement(postId, summary);
	}
}

/**
 * The city's unread comments read, for an operation that needs them before it goes on: its run on
 * the city queue (one in flight per city) awaited. From a workflow's body only.
 */
export const readCommentsOfCity = async (
	durable: Pick<DurableWorkflowsService, 'start'>,
	workflow: ReadCommentsWorkflow,
	cityId: string,
): Promise<ReadCommentsCityResult> =>
	(
		await durable.start(workflow.readCity, [cityId], {
			queue: READ_COMMENTS_CITY_QUEUE,
			dedupe: cityId,
			onDuplicate: 'return-existing',
			attributes: { cityId, purpose: 'read-comments' },
		})
	).getResult();
