import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import type { WorkflowHandle } from '@dbos-inc/dbos-sdk';

import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { DurableLlmService } from 'src/modules/llm/services/durable-llm.service.js';
import { withLlmCallContext } from 'src/modules/llm/util/llm-call-context.js';
import type { PostForReading } from 'src/modules/social/interfaces/post-reading.interface.js';
import {
	MentionExtractionService,
	type ReflagSaved,
} from 'src/modules/social/services/mention-extraction.service.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';

import { PostClaimsAgent } from '../../read-posts/agents/post-claims.agent.js';
import { postClaimsSource } from '../../read-posts/util/post-claims-input.js';
import { readPostClaims } from '../../read-posts/util/post-claims-read.js';
import { REFLAG_OPENINGS_QUEUE } from '../queues/reflag-openings.queue.js';

/** Which stored posts a page re-flags (`MentionExtractionService.reflagCandidates`); times as ISO strings */
export interface ReflagPage {
	month: string;
	cityId?: string;
	analysedBefore?: string;
	onlyFlagged?: boolean;
	limit: number;
	offset: number;
}

/** What one page did */
export interface ReflagPageResult {
	total: number;
	posts: number;
	read: number;
	failed: number;
	flaggedMentions: number;
	flaggedPosts: number;
	cleared: number;
	unpaired: number;
	tokens: number;
}

type ReflagPostResult = (ReflagSaved & { tokens: number }) | null;

/**
 * A month's stored posts read again by agent A for the "just opened" flag only, a page at a time
 * (the admin's `POST /admin/mentions/reflag-openings`): each post its own child (`reflagPost`),
 * started then awaited in order; each answered place paired with the post's stored mention
 * (`MentionExtractionService.saveReflag`), which takes the flag. Nothing else is written.
 */
@Injectable()
export class ReflagOpeningsWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly durableLlm: DurableLlmService,
		private readonly postClaimsAgent: PostClaimsAgent,
		private readonly extraction: MentionExtractionService,
		private readonly topicService: TopicService,
	) {}

	@DurableWorkflow({ name: 'reflag-openings.page' })
	@EnsureRequestContext()
	async reflagPage(page: ReflagPage): Promise<ReflagPageResult> {
		const { total, postIds } = await this.candidates(page);
		const handles: WorkflowHandle<ReflagPostResult>[] = [];
		for (const postId of postIds)
			handles.push(
				await this.durable.start(this.reflagPost, [postId], {
					queue: REFLAG_OPENINGS_QUEUE,
					attributes: { purpose: 'reflag-openings' },
				}),
			);
		const result: ReflagPageResult = {
			total,
			posts: postIds.length,
			read: 0,
			failed: 0,
			flaggedMentions: 0,
			flaggedPosts: 0,
			cleared: 0,
			unpaired: 0,
			tokens: 0,
		};
		for (const handle of handles) {
			try {
				const post = await handle.getResult();
				if (!post) continue;
				result.read++;
				result.flaggedMentions += post.flaggedMentions;
				if (post.flagged) result.flaggedPosts++;
				result.cleared += post.cleared;
				result.unpaired += post.unpaired;
				result.tokens += post.tokens;
			} catch {
				result.failed++;
			}
		}
		return result;
	}

	@DurableWorkflow({ name: 'reflag-openings.post' })
	@EnsureRequestContext()
	async reflagPost(postId: string): Promise<ReflagPostResult> {
		const plan = await this.plan(postId);
		if (!plan) return null;
		return withLlmCallContext(
			{ cityId: plan.post.cityId, purpose: 'reflag-openings' },
			async () => {
				const reading = await readPostClaims(
					this.durableLlm.as(this.postClaimsAgent),
					postClaimsSource(plan.post),
					{ cityName: plan.post.cityName, topics: plan.topics },
				);
				const saved = await this.saveFlags(postId, reading.object.places);
				return { ...saved, tokens: reading.usage.totalTokens };
			},
		);
	}

	@DurableStep({ name: 'candidates' })
	private async candidates(page: ReflagPage) {
		return this.extraction.reflagCandidates({
			...page,
			analysedBefore: page.analysedBefore ? new Date(page.analysedBefore) : undefined,
		});
	}

	@DurableStep({ name: 'plan' })
	private async plan(postId: string): Promise<{ post: PostForReading; topics: string[] } | null> {
		const post = await this.extraction.postForReading(postId);
		if (!post) return null;
		const index = await this.topicService.index();
		return { post, topics: index.food.map(t => t.label) };
	}

	@DurableStep({ name: 'save flags' })
	private async saveFlags(
		postId: string,
		places: { venueName: string; isNewOpening: boolean }[],
	): Promise<ReflagSaved> {
		return this.extraction.saveReflag(postId, places);
	}
}
