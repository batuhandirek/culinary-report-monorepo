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
import {
	type MatchPass,
	MentionMatchingService,
} from 'src/modules/social/services/mention-matching.service.js';
import { StatementPartsService } from 'src/modules/statements/services/statement-parts.service.js';

import { queueCloseCalls } from '../../match-mentions/util/close-calls.js';
import { PostClaimsAgent } from '../agents/post-claims.agent.js';
import { PostGateAgent } from '../agents/post-gate.agent.js';
import { READ_POSTS_PER_RUN, readPostRunId } from '../constants/read-posts.constant.js';
import { READ_POSTS_QUEUE } from '../queues/read-posts.queue.js';
import { postClaimsSource } from '../util/post-claims-input.js';
import { readPostClaims } from '../util/post-claims-read.js';
import { gateInput, hasContent } from '../util/post-gate-input.js';

/** What reading one post did: the workflow's result */
export type ReadPostResult =
	| { read: false }
	| { skipped: string }
	| { places: number; claims: number; calls: number; matched: number; asked: number };

/** What reading a city's unread posts did */
export interface ReadCityResult {
	posts: number;
	read: number;
	skipped: number;
	failed: number;
}

/** A post as the plan step stores it */
interface PostPlan {
	post: PostForReading;
}

/**
 * The reading of posts. `readPost` is one post as a workflow of its own: the gate, then agent A
 * (its places and claims), the claims' labels, the city's venue tags queued, then its places matched:
 * what the code is sure of saved, each close call queued as a run of its own
 * (`match-mentions.mention`, not awaited, so a call waiting for the allowance never holds the
 * reading). Each agent call is a
 * child on its tier's LLM queue that waits until an account can serve it, so a post waiting for the
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
		private readonly mentionMatchingService: MentionMatchingService,
		private readonly statementPartsService: StatementPartsService,
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

	private async read({ post }: PostPlan): Promise<ReadPostResult> {
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
			{ cityName: post.cityName },
		);
		const saved = await this.saveReading(post.postId, {
			...reading.object,
			tokens: reading.usage.totalTokens,
		});

		// 3. The claims' labels (Jev), and the city's venue tags, which read what the claims name
		await this.labelClaims(saved.claimIds);
		await this.linkTopics(post.cityId, saved.mentionIds.length > 0);

		// 4. Its places matched: the sure ones saved now, each close call queued, never awaited
		const pass = await this.matchPlaces(saved.mentionIds);
		await queueCloseCalls(this.durable, pass.asks, post.cityId);
		return {
			places: saved.mentionIds.length,
			claims: saved.claimIds.length,
			calls: reading.calls + 1,
			matched: Object.values(pass.counts).reduce((a, b) => a + b, 0),
			asked: pass.asks.length,
		};
	}

	// ─── Steps: each one domain call, its result stored ───

	@DurableStep({ name: 'unread posts' })
	private async unreadPosts(cityId: string): Promise<string[]> {
		return this.extraction.unreadPostIds(cityId, READ_POSTS_PER_RUN);
	}

	/** The post as the gate and agent A see it; none when it was read meanwhile */
	@DurableStep({ name: 'plan' })
	private async plan(postId: string): Promise<PostPlan | null> {
		const post = await this.extraction.postForReading(postId, { unread: true });
		return post && { post };
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
	private async linkTopics(cityId: string, changed: boolean): Promise<void> {
		if (changed) await this.extraction.queueVenueTags(cityId);
	}

	@DurableStep({ name: 'match places' })
	private async matchPlaces(mentionIds: number[]): Promise<MatchPass> {
		return this.mentionMatchingService.matchMentions(mentionIds);
	}
}
