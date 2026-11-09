import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import type { WorkflowHandle } from '@dbos-inc/dbos-sdk';

import { runActorCallRef } from 'src/modules/apify/actors/actor.js';
import {
	GOOGLE_MAPS_REVIEWS_ACTOR,
	GOOGLE_REVIEW_USD,
	type GoogleMapsReviewItem,
} from 'src/modules/apify/actors/google-maps-reviews.actor.js';
import { type ActorRunRef, ApifyService } from 'src/modules/apify/services/apify.service.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { settleHandles } from 'src/modules/durable-workflows/util/durable-steps.js';
import { ReviewService } from 'src/modules/venues/services/review.service.js';

import {
	REVIEWS_CAP_REACHED_SHARE,
	REVIEWS_MIN_CAP_USD,
	REVIEWS_WORKFLOW,
} from '../constants/reviews.constant.js';
import { type ReviewsCall, reviewsInput } from '../util/reviews-input.js';

/** One review fetch, as a caller asks for it (plain JSON: the workflow's stored argument) */
export interface ReviewsRun extends ReviewsCall {
	/** The fetch's time as the operation's clock has it (ISO): the stamp on every stretch and snapshot it writes */
	now: string;
	/** Filled by `start`: the workflow that asked (the operation), the run's owner on its `ApifyRun` row */
	owner?: string;
}

/** What a caller reads back: never the items (they stay on the `ApifyRun` row), only what it needs */
export interface ReviewsResult {
	/** `ApifyRun.id`: `ApifyService.storedItems(recordId)` reads the items again */
	recordId: string;
	/** Items the run returned */
	found: number;
	/** Review rows written (a `since` fetch: every review from its day on) */
	saved: number;
	/** Venues given today's rating snapshot from their items */
	rated: number;
	/** The places that returned an item, in the run's order */
	returned: string[];
	/** The run spent `REVIEWS_CAP_REACHED_SHARE` of its cap: its last place's older reviews may be cut */
	capped: boolean;
	/** A `newest` fetch: places whose newest review is older than their day (nothing new, marked fetched) */
	upToDate: number;
	/** A `newest` fetch: places with a review since their day (an earlier run's cap never reached them) */
	missed: number;
}

/**
 * The `reviews` atom: every Google review fetch in the app, one workflow (`reviews.run`). A caller
 * describes the fetch (`ReviewsFetch`: these places from a day, or each place's newest review);
 * the atom builds the actor's input, runs the actor as a child on the `apify` queue (the credit
 * wait, four at a time, one run shared by callers asking for the same input) and saves what came
 * back through the one save path (`ReviewService.saveReviews`: the review rows, each venue's
 * rating snapshot, its stored stretch) in a step. Its result is counts and the places that
 * answered, never items.
 *
 * Started from an operation's body with `start` (a handle), `call` (the result) or `callAll`
 * (several runs started first, then awaited in order), never from inside a step. A child started
 * from a body gets DBOS's deterministic child id, so a resumed parent re-attaches to it.
 */
@Injectable()
export class ReviewsWorkflow {
	private readonly logger = new Logger(ReviewsWorkflow.name);

	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly apifyService: ApifyService,
		private readonly reviewService: ReviewService,
	) {}

	@DurableWorkflow({ name: REVIEWS_WORKFLOW })
	@EnsureRequestContext()
	async run(run: ReviewsRun): Promise<ReviewsResult> {
		const ref = await runActorCallRef(
			this.apifyService,
			{
				actor: GOOGLE_MAPS_REVIEWS_ACTOR,
				input: reviewsInput(run.fetch),
				maxCostUsd: capOf(run),
				purpose: run.purpose,
			},
			run.owner ? { ownerWorkflowId: run.owner } : {},
		);
		return this.save(run, ref);
	}

	/**
	 * Starts a run from an operation's body as its child, tagged for `/admin/workflows` (the
	 * purpose), the operation as the run's owner. The handle, for a fan-out.
	 */
	async start(run: ReviewsRun): Promise<WorkflowHandle<ReviewsResult>> {
		const owner = this.durable.workflowId();
		return this.durable.start(this.run, [{ ...run, ...(owner && { owner }) }], {
			attributes: { purpose: run.purpose },
		});
	}

	/** `start` and its result */
	async call(run: ReviewsRun): Promise<ReviewsResult> {
		return (await this.start(run)).getResult();
	}

	/**
	 * A plan's runs, every one started first and then awaited in order (the `apify` queue paces
	 * them), their results in the plan's order. A failed run fails the call only once every other
	 * has settled, so what the rest fetched is saved; the operation shows which run failed.
	 */
	async callAll(calls: ReviewsCall[], now: Date): Promise<ReviewsResult[]> {
		const handles: WorkflowHandle<ReviewsResult>[] = [];
		for (const call of calls)
			handles.push(await this.start({ ...call, now: now.toISOString() }));
		const settled = await settleHandles(handles);
		const failed = settled.flatMap((outcome, i) =>
			outcome.ok ? [] : [`${calls[i].purpose}: ${outcome.error}`],
		);
		if (failed.length)
			throw new Error(
				`${failed.length} of ${calls.length} review runs failed (${failed.join('; ')})`,
			);
		return settled.map(outcome => (outcome.ok ? outcome.value : never()));
	}

	/** The run's items read from its row and saved; the counts and the places that answered */
	@DurableStep({ name: 'save reviews' })
	private async save(run: ReviewsRun, ref: ActorRunRef): Promise<ReviewsResult> {
		const items = await this.apifyService.storedItems<GoogleMapsReviewItem>(ref.recordId);
		const capped = items.length * GOOGLE_REVIEW_USD >= capOf(run) * REVIEWS_CAP_REACHED_SHARE;
		const saved = await this.reviewService.saveReviews(items, run.fetch, {
			capped,
			now: new Date(run.now),
		});
		this.logger.log(
			`${run.purpose}: ${items.length} items, ${saved.saved} reviews saved, ${saved.returned.length} places answered${capped ? ' (cap reached)' : ''}`,
		);
		return { recordId: ref.recordId, found: items.length, capped, ...saved };
	}
}

/** The run's cap as the actor gets it: the caller's, floored at the actor's lowest */
const capOf = (run: ReviewsCall): number => Math.max(REVIEWS_MIN_CAP_USD, run.maxCostUsd);

const never = (): never => {
	throw new Error('unreachable');
};
