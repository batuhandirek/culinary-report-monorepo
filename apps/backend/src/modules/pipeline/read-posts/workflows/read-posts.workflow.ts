import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import type { WorkflowHandle } from '@dbos-inc/dbos-sdk';

import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { DurableLlmService } from 'src/modules/llm/services/durable-llm.service.js';
import { withLlmCallContext } from 'src/modules/llm/util/llm-call-context.js';
import type {
	GateVerdict,
	PostForReading,
	PostReadingAnswer,
} from 'src/modules/social/interfaces/post-reading.interface.js';
import { MentionExtractionService } from 'src/modules/social/services/mention-extraction.service.js';
import { StatementPartsService } from 'src/modules/statements/services/statement-parts.service.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';

import { PostClaimsAgent } from '../agents/post-claims.agent.js';
import { PostGateAgent } from '../agents/post-gate.agent.js';
import { READ_POSTS_PER_RUN, readPostRunId } from '../constants/read-posts.constant.js';
import { READ_POSTS_QUEUE } from '../queues/read-posts.queue.js';
import { postClaimsSource } from '../util/post-claims-input.js';
import { readPostClaims } from '../util/post-claims-read.js';
import { gateInput, hasContent } from '../util/post-gate-input.js';

/** What reading one post did: the workflow's result */
export type ReadPostResult =
	{ read: false } | { skipped: string } | { places: number; claims: number; calls: number };

/** What reading a city's unread posts did */
export interface ReadCityResult {
	posts: number;
	read: number;
	skipped: number;
	failed: number;
}

/** A post and the food topics' labels (agent A's cuisine words), as the plan step stores them */
interface PostPlan {
	post: PostForReading;
	topics: string[];
}

/**
 * The reading of posts. `readPost` is one post as a workflow of its own: the gate, then agent A
 * (its places and claims), the claims' labels, the mentions' food topics. Each agent call is a
 * child on the `llm` queue that waits until an account can serve it, so a post waiting for the
 * allowance never holds the others back, a resume never asks a finished call again, and the
 * ledger files each call under the post's run. `readCity` is a city's unread posts, each started
 * under its one id (`readPostRunId`) and awaited: the hourly `ReadPostsSchedule` and any
 * operation that needs the posts read call it.
 */
@Injectable()
export class ReadPostsWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly durableLlm: DurableLlmService,
		private readonly postGateAgent: PostGateAgent,
		private readonly postClaimsAgent: PostClaimsAgent,
		private readonly extraction: MentionExtractionService,
		private readonly statementPartsService: StatementPartsService,
		private readonly topicService: TopicService,
	) {}

	@DurableWorkflow({ name: 'read-posts.city' })
	@EnsureRequestContext()
	async readCity(cityId: string): Promise<ReadCityResult> {
		const postIds = await this.unreadPosts(cityId);
		// Every post started first, then each awaited in order (never Promise.all over workflows)
		const handles: WorkflowHandle<ReadPostResult>[] = [];
		for (const postId of postIds)
			handles.push(
				await this.durable.start(this.readPost, [postId], {
					queue: READ_POSTS_QUEUE,
					workflowId: readPostRunId(postId),
					attributes: { cityId, purpose: 'read-posts' },
				}),
			);
		const result: ReadCityResult = { posts: postIds.length, read: 0, skipped: 0, failed: 0 };
		for (const handle of handles) {
			try {
				const post = await handle.getResult();
				if ('skipped' in post) result.skipped++;
				else if ('places' in post) result.read++;
			} catch {
				result.failed++;
			}
		}
		return result;
	}

	@DurableWorkflow({ name: 'read-posts.post' })
	@EnsureRequestContext()
	async readPost(postId: string): Promise<ReadPostResult> {
		const plan = await this.plan(postId);
		if (!plan) return { read: false };
		return withLlmCallContext({ cityId: plan.post.cityId, purpose: 'read-posts' }, () =>
			this.read(plan),
		);
	}

	private async read({ post, topics }: PostPlan): Promise<ReadPostResult> {
		// 1. The gate: is it about eating or drinking out in the city? (nothing to read: no call)
		const gate =
			hasContent(post) ?
				await this.durableLlm.generate(
					this.postGateAgent,
					JSON.stringify(gateInput(post)),
					{ cityName: post.cityName },
				)
			:	null;
		const verdict: GateVerdict | null = gate && {
			digest: gate.object.digest,
			reason: gate.object.reason,
		};
		if (!(await this.saveGate(post.postId, verdict)))
			return { skipped: verdict ? (verdict.reason ?? 'not_food') : 'no_content' };

		// 2. Agent A: its places and its claims (a long post in parts, each part a call)
		const reading = await readPostClaims(
			this.durableLlm.as(this.postClaimsAgent),
			postClaimsSource(post),
			{ cityName: post.cityName, topics },
		);
		const saved = await this.saveReading(post.postId, {
			...reading.object,
			tokens: reading.usage.totalTokens,
		});

		// 3. The claims' labels (Jev) and the mentions' food topics
		await this.labelClaims(saved.claimIds);
		await this.linkTopics(post.cityId, saved.mentionIds);
		return {
			places: saved.mentionIds.length,
			claims: saved.claimIds.length,
			calls: reading.calls + 1,
		};
	}

	// ─── Steps: each one domain call, its result stored ───

	@DurableStep({ name: 'unread posts' })
	private async unreadPosts(cityId: string): Promise<string[]> {
		return this.extraction.unreadPostIds(cityId, READ_POSTS_PER_RUN);
	}

	/** The post as the gate and agent A see it, and the food topics' labels; none when it was read meanwhile */
	@DurableStep({ name: 'plan' })
	private async plan(postId: string): Promise<PostPlan | null> {
		const post = await this.extraction.postForReading(postId, { unread: true });
		if (!post) return null;
		const index = await this.topicService.index();
		return { post, topics: index.food.map(t => t.label) };
	}

	@DurableStep({ name: 'save gate' })
	private async saveGate(postId: string, verdict: GateVerdict | null): Promise<boolean> {
		return this.extraction.saveGate(postId, verdict);
	}

	@DurableStep({ name: 'save reading' })
	private async saveReading(postId: string, answer: PostReadingAnswer) {
		return this.extraction.saveReading(postId, answer);
	}

	/** Agent A's foods stored as parts, then the labels; what the classifier misses, the `statement-parts` backlog reads */
	@DurableStep({ name: 'label claims' })
	private async labelClaims(claimIds: number[]): Promise<void> {
		if (claimIds.length) await this.statementPartsService.read({ ids: claimIds });
	}

	@DurableStep({ name: 'link topics' })
	private async linkTopics(cityId: string, mentionIds: number[]): Promise<void> {
		await this.extraction.linkTopics(cityId, mentionIds);
	}
}
