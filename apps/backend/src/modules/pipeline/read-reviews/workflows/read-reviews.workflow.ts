import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import type { WorkflowHandle } from '@dbos-inc/dbos-sdk';

import { ITEM_RUN_KEEP_DAYS } from 'src/modules/durable-workflows/constants/durable-workflows.constant.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { DurableLlmService } from 'src/modules/llm/services/durable-llm.service.js';
import { withLlmCallContext } from 'src/modules/llm/util/llm-call-context.js';
import type { Claim } from 'src/modules/statements/services/statement.service.js';
import { StatementPartsService } from 'src/modules/statements/services/statement-parts.service.js';
import {
	type ReviewForReading,
	ReviewService,
} from 'src/modules/venues/services/review.service.js';

import { ReviewClaimsAgent } from '../agents/review-claims.agent.js';
import { READ_REVIEWS_PER_RUN, readReviewWorkflowId } from '../constants/read-reviews.constant.js';
import { READ_REVIEWS_CITY_QUEUE, READ_REVIEWS_QUEUE } from '../queues/read-reviews.queue.js';
import { reviewClaimsMessage } from '../util/review-claims-input.js';

/** What reading one review did */
export type ReadReviewResult = { read: false } | { claims: number };

/** What a city's run did: its unread reviews started, read, and failed (each waits for an admin) */
export interface ReadReviewsCityResult {
	reviews: number;
	read: number;
	failed: number;
}

/**
 * The reading of written reviews (Google and TripAdvisor): one workflow per review, agent A
 * (`ReviewClaimsAgent`) as a child that waits until an account can serve it, its claims saved, then
 * their labels (Jev). A city's run starts every unread review's workflow under its fixed id and
 * awaits them: the hourly schedule's, and what an operation that needs the city's reviews read
 * calls (`readReviewsOfCity`).
 */
@Injectable()
export class ReadReviewsWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly durableLlm: DurableLlmService,
		private readonly reviewService: ReviewService,
		private readonly statementPartsService: StatementPartsService,
		private readonly agent: ReviewClaimsAgent,
	) {}

	@DurableWorkflow({ name: 'read-reviews.city', keepDays: ITEM_RUN_KEEP_DAYS })
	@EnsureRequestContext()
	async readCity(cityId: string): Promise<ReadReviewsCityResult> {
		const reviewIds = await this.unreadReviews(cityId);
		const handles: WorkflowHandle<ReadReviewResult>[] = [];
		for (const reviewId of reviewIds)
			handles.push(
				await this.durable.start(this.readReview, [reviewId], {
					queue: READ_REVIEWS_QUEUE,
					workflowId: readReviewWorkflowId(reviewId),
					attributes: { cityId, purpose: 'read-reviews' },
				}),
			);
		const result = { reviews: reviewIds.length, read: 0, failed: 0 };
		for (const handle of handles) {
			const done = await handle.getResult().catch(() => null);
			if (!done) result.failed++;
			else if ('claims' in done) result.read++;
		}
		return result;
	}

	@DurableWorkflow({ name: 'read-reviews.review', keepDays: ITEM_RUN_KEEP_DAYS })
	@EnsureRequestContext()
	async readReview(reviewId: string): Promise<ReadReviewResult> {
		const review = await this.plan(reviewId);
		if (!review) return { read: false };
		return withLlmCallContext({ cityId: review.cityId, purpose: 'read-reviews' }, async () => {
			const answer = await this.durableLlm.generate(this.agent, reviewClaimsMessage(review));
			const claimIds = await this.save(review.id, answer.object.claims);
			await this.labelClaims(claimIds);
			return { claims: claimIds.length };
		});
	}

	@DurableStep({ name: 'unread reviews' })
	private async unreadReviews(cityId: string): Promise<string[]> {
		return this.reviewService.unreadReviewIds(cityId, READ_REVIEWS_PER_RUN);
	}

	/** The review as agent A reads it; none when it was read meanwhile or has no text */
	@DurableStep({ name: 'plan' })
	private async plan(reviewId: string): Promise<ReviewForReading | null> {
		return this.reviewService.reviewForReading(reviewId);
	}

	@DurableStep({ name: 'save claims' })
	private async save(reviewId: string, claims: Claim[]): Promise<number[]> {
		return this.reviewService.saveReviewReading(reviewId, claims);
	}

	/** Agent A's foods stored as parts, then the labels; what the classifier misses, the `statement-parts` backlog reads */
	@DurableStep({ name: 'label claims' })
	private async labelClaims(claimIds: number[]): Promise<void> {
		if (claimIds.length) await this.statementPartsService.read({ ids: claimIds });
	}
}

/**
 * The city's unread reviews read, for an operation that needs them before it goes on: its run on
 * the city queue (one in flight per city, a second asker gets that one) awaited. From a
 * workflow's body only.
 */
export const readReviewsOfCity = async (
	durable: Pick<DurableWorkflowsService, 'start'>,
	workflow: ReadReviewsWorkflow,
	cityId: string,
): Promise<ReadReviewsCityResult> =>
	(
		await durable.start(workflow.readCity, [cityId], {
			queue: READ_REVIEWS_CITY_QUEUE,
			dedupe: cityId,
			onDuplicate: 'return-existing',
			attributes: { cityId, purpose: 'read-reviews' },
		})
	).getResult();
