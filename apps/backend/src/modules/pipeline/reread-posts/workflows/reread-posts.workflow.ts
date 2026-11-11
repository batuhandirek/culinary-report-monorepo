import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableLlmService } from 'src/modules/llm/services/durable-llm.service.js';
import { withLlmCallContext } from 'src/modules/llm/util/llm-call-context.js';
import type {
	GateVerdict,
	PostForReading,
	PostReadingAnswer,
} from 'src/modules/social/interfaces/post-reading.interface.js';
import {
	MentionExtractionService,
	type RereadSaved,
} from 'src/modules/social/services/mention-extraction.service.js';
import { POSTS_GATED_AT } from 'src/modules/statements/constants/statements-shipped.constant.js';
import { StatementPartsService } from 'src/modules/statements/services/statement-parts.service.js';

import { PostClaimsAgent } from '../../read-posts/agents/post-claims.agent.js';
import { PostGateAgent } from '../../read-posts/agents/post-gate.agent.js';
import { postClaimsSource } from '../../read-posts/util/post-claims-input.js';
import { readPostClaims } from '../../read-posts/util/post-claims-read.js';
import { gateInput, hasContent } from '../../read-posts/util/post-gate-input.js';

/** What re-reading one post did: the workflow's result */
export type RereadPostResult =
	| { read: false }
	| { skipped: string; deleted: number }
	| (Omit<RereadSaved, 'claimIds' | 'addedMentionIds'> & { claims: number; calls: number });

/**
 * One post read before `POSTS_GATED_AT` read again, as a workflow of its own (nightly,
 * `RereadPostsSchedule`): the gate first (a skipped post loses its claims and every mention but
 * an admin's), then agent A, whose places are paired with the post's stored mentions and never
 * re-match one (`MentionExtractionService.saveReread`), then the new claims' labels and the city's
 * venue tags queued (they read what the claims name). The same agents as `read-posts`, each call a child that waits for an
 * account.
 */
@Injectable()
export class RereadPostsWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durableLlm: DurableLlmService,
		private readonly postGateAgent: PostGateAgent,
		private readonly postClaimsAgent: PostClaimsAgent,
		private readonly extraction: MentionExtractionService,
		private readonly statementPartsService: StatementPartsService,
	) {}

	/**
	 * `byHand`: an admin's "Re-analyse" on a post row, which reads it again whenever it was read
	 * (the nightly run only takes posts read before `POSTS_GATED_AT`)
	 */
	@DurableWorkflow({ name: 'reread-posts.post' })
	@EnsureRequestContext()
	async rereadPost(postId: string, byHand = false): Promise<RereadPostResult> {
		const plan = await this.plan(postId, byHand);
		if (!plan) return { read: false };
		return withLlmCallContext({ cityId: plan.post.cityId, purpose: 'reread-posts' }, () =>
			this.reread(plan.post),
		);
	}

	private async reread(post: PostForReading): Promise<RereadPostResult> {
		// 1. The gate: a post it skips keeps nothing but an admin's mentions
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
		if (!(await this.saveGate(post.postId, verdict))) {
			const { deleted } = await this.clearReading(post.postId);
			return { skipped: verdict ? (verdict.reason ?? 'not_food') : 'no_content', deleted };
		}

		// 2. Agent A, its places paired with the stored mentions
		const reading = await readPostClaims(
			this.durableLlm.as(this.postClaimsAgent),
			postClaimsSource(post),
			{ cityName: post.cityName },
		);
		const { claimIds, addedMentionIds, ...saved } = await this.saveReread(post.postId, {
			...reading.object,
			tokens: reading.usage.totalTokens,
		});

		// 3. The new claims' labels, then the city's venue tags, which read what the claims name
		await this.labelClaims(claimIds);
		await this.linkTopics(post.cityId, claimIds.length + addedMentionIds.length > 0);
		return { ...saved, claims: claimIds.length, calls: reading.calls + 1 };
	}

	// ─── Steps: each one domain call, its result stored ───

	/** The post as the gate and agent A see it; none when it was re-read meanwhile (any post by hand) */
	@DurableStep({ name: 'plan' })
	private async plan(postId: string, byHand: boolean): Promise<{ post: PostForReading } | null> {
		const post = await this.extraction.postForReading(
			postId,
			byHand ? {} : { analysedBefore: POSTS_GATED_AT },
		);
		return post && { post };
	}

	@DurableStep({ name: 'save gate' })
	private async saveGate(postId: string, verdict: GateVerdict | null): Promise<boolean> {
		return this.extraction.saveGate(postId, verdict);
	}

	@DurableStep({ name: 'clear reading' })
	private async clearReading(postId: string): Promise<{ deleted: number }> {
		return this.extraction.clearReading(postId);
	}

	@DurableStep({ name: 'save reread' })
	private async saveReread(postId: string, answer: PostReadingAnswer): Promise<RereadSaved> {
		return this.extraction.saveReread(postId, answer);
	}

	@DurableStep({ name: 'label claims' })
	private async labelClaims(claimIds: number[]): Promise<void> {
		if (claimIds.length) await this.statementPartsService.read({ ids: claimIds });
	}

	@DurableStep({ name: 'link topics' })
	private async linkTopics(cityId: string, changed: boolean): Promise<void> {
		if (changed) await this.extraction.queueVenueTags(cityId);
	}
}
