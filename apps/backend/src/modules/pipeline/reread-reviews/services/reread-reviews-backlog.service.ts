import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { LlmBacklogRegistry } from 'src/modules/backlog/services/llm-backlog-registry.service.js';
import { REVIEWS_QUOTED_AT } from 'src/modules/statements/constants/statements-shipped.constant.js';
import type { Claim } from 'src/modules/statements/services/statement.service.js';
import { StatementPartsService } from 'src/modules/statements/services/statement-parts.service.js';
import { ReviewService } from 'src/modules/venues/services/review.service.js';
import { runPool } from 'src/shared/util/pool.js';

import { ReviewClaimsAgent } from '../../read-reviews/agents/review-claims.agent.js';
import { reviewClaimsMessage } from '../../read-reviews/util/review-claims-input.js';
import {
	REREAD_REVIEWS_BATCH,
	REREAD_REVIEWS_CONCURRENCY,
} from '../constants/reread-reviews.constant.js';

/**
 * The re-read of reviews read before `REVIEWS_QUOTED_AT` (agent A again, the claims replaced, their
 * labels read), as the `reread-reviews` backlog (priority 40) the nightly drain runs
 * (`LlmBacklogWorkflows.drain`). A backlog, not a schedule of its own: the drain shares one day's
 * token budget across every backlog in priority order and stops one for the day when no model is
 * left, so the re-read only burns what the day leaves; a workflow per review would wait for the
 * next day's allowance and take it from the day's reading. The batch runs inside the drain's step,
 * so its agent calls are the plain ones.
 */
@Injectable()
export class RereadReviewsBacklogService implements OnModuleInit {
	private readonly logger = new Logger(RereadReviewsBacklogService.name);

	constructor(
		private readonly llmBacklogRegistry: LlmBacklogRegistry,
		private readonly reviewService: ReviewService,
		private readonly statementPartsService: StatementPartsService,
		private readonly agent: ReviewClaimsAgent,
	) {}

	onModuleInit() {
		this.llmBacklogRegistry.register({
			key: 'reread-reviews',
			label: 'Re-read reviews as claims',
			priority: 40,
			remaining: () => this.reviewService.countToReread(REVIEWS_QUOTED_AT),
			runBatch: () => this.batch(REREAD_REVIEWS_BATCH),
		});
	}

	/**
	 * The newest `limit` reviews read before `before` (the cutoff), read again side by side. The
	 * answers are saved one after the other once the calls are done (never a flush inside the
	 * pool), then their claims labelled. A review the agent fails on stays to be read again; a
	 * provider failure (no model left) saves what was answered, leaves its labels to the
	 * `statement-parts` backlog and ends the batch with the error.
	 */
	async batch(
		limit: number,
		before = REVIEWS_QUOTED_AT,
	): Promise<{ done: number; tokens: number }> {
		const ids = await this.reviewService.reviewIdsToReread(before, limit);
		const answers: { id: string; claims: Claim[] }[] = [];
		let tokens = 0;
		let failure: unknown;
		try {
			await runPool(
				ids,
				REREAD_REVIEWS_CONCURRENCY,
				async id => {
					const review = await this.reviewService.reviewForReading(id, {
						analysedBefore: before,
					});
					if (!review) return;
					const res = await this.agent.generate(reviewClaimsMessage(review));
					tokens += res.usage?.totalTokens ?? 0;
					answers.push({ id, claims: res.object.claims });
				},
				(id, e) => this.logger.warn(`Review ${id} failed: ${e.message}`),
			);
		} catch (e) {
			failure = e;
		}
		const claimIds: number[] = [];
		for (const { id, claims } of answers)
			claimIds.push(...(await this.reviewService.saveReviewReading(id, claims)));
		if (failure) throw failure;
		const parts = await this.statementPartsService.read({ ids: claimIds });
		return { done: answers.length, tokens: tokens + parts.tokens };
	}
}
