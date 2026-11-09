import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { GOOGLE_REVIEW_USD } from 'src/modules/apify/actors/google-maps-reviews.actor.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { stepBudgetUsd } from 'src/modules/cities/util/city.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow } from 'src/modules/durable-workflows/util/durable-steps.js';
import { RatingSnapshotService } from 'src/modules/venues/services/rating-snapshot.service.js';
import { type BackfillPlan, ReviewService } from 'src/modules/venues/services/review.service.js';
import { backfillRunCap } from 'src/modules/venues/util/review-fetch.js';

import { REVIEWS_MIN_CAP_USD } from '../../atoms/reviews/constants/reviews.constant.js';
import { ReviewsWorkflow } from '../../atoms/reviews/workflows/reviews.workflow.js';
import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import { DAY_MS } from '../../shared/constants/cadence.constant.js';

export interface BackfillReviewsParams {
	/** The first day kept, `YYYY-MM-DD` */
	since: string;
	/** The venues posts named in this many days */
	talkedDays: number;
	/** The run's cap over all its attempts; the city's budget without */
	budgetUsd?: number;
}

/** What the backfill planned and fetched: the run's result */
export interface BackfillReviewsSummary extends Omit<BackfillPlan, 'runs'> {
	/** Venues posts named in the window */
	talked: number;
	/** Of them, those with reviews stored from `since` already (left out) */
	withHistory: number;
	since: string;
	budgetUsd: number;
	/** Actor runs made */
	runs: number;
	saved: number;
	/** Venues that returned reviews */
	returned: number;
}

/**
 * A city-wide review backfill, started by hand (`POST /admin/backfill-reviews`), never by a
 * schedule: every open venue posts named in the last `talkedDays`, most named first, that has no
 * Google reviews stored from `since`, planned at its share of its all-time review count, as the
 * budget covers, fetched in runs of `BACKFILL_RUN_VENUES` one after the other (each a
 * `reviews.run` child capped over its plan, never more than the budget left) until the budget is
 * spent. A resumed run re-attaches to its finished children, so their spend stays counted.
 */
@Injectable()
export class BackfillReviewsWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly ratingSnapshotService: RatingSnapshotService,
		private readonly reviewService: ReviewService,
		private readonly reviews: ReviewsWorkflow,
	) {}

	@DurableWorkflow({ name: 'backfill-reviews.run' })
	@EnsureRequestContext()
	async run(cityId: string, params: BackfillReviewsParams): Promise<BackfillReviewsSummary> {
		const now = await durableNow(this.durable);
		const { runs: planned, ...plan } = await this.plan(cityId, params, now);
		let spentUsd = 0;
		let saved = 0;
		let returned = 0;
		let runs = 0;
		for (const chunk of planned) {
			runs++;
			const result = await this.reviews.call({
				fetch: { mode: 'since', placeIds: chunk.placeIds, since: plan.since },
				maxCostUsd: backfillRunCap(
					chunk.plannedUsd,
					plan.budgetUsd - spentUsd,
					REVIEWS_MIN_CAP_USD,
				),
				purpose: `google-reviews backfill from ${plan.since}: ${chunk.placeIds.length} venues`,
				now: now.toISOString(),
			});
			saved += result.saved;
			returned += result.returned.length;
			spentUsd += result.saved * GOOGLE_REVIEW_USD;
			if (spentUsd >= plan.budgetUsd) break;
		}
		return { ...plan, runs, saved, returned };
	}

	/** The venues to backfill (posts named them, nothing stored from `since`), planned as the budget covers */
	@DurableStep({ name: 'plan backfill' })
	private async plan(
		cityId: string,
		{ since, talkedDays, budgetUsd }: BackfillReviewsParams,
		now: Date,
	): Promise<
		BackfillPlan & { talked: number; withHistory: number; since: string; budgetUsd: number }
	> {
		const city = await this.cityService.getById(cityId);
		const budget = budgetUsd ?? stepBudgetUsd(city, PipelineStepEnum.BACKFILL_REVIEWS);
		const talked = (await this.ratingSnapshotService.due(city, now, talkedDays)).filter(
			v => v.posts > 0,
		);
		const ids = talked.map(v => v.id);
		// A stretch from `since` itself counts: the day after is the bound
		const withHistory = await this.reviewService.venuesWithHistory(
			ids,
			new Date(new Date(`${since}T00:00:00Z`).getTime() + DAY_MS),
		);
		const plan = await this.reviewService.planBackfill(
			ids.filter(id => !withHistory.has(id)),
			since,
			budget,
			now,
		);
		return {
			...plan,
			talked: ids.length,
			withHistory: withHistory.size,
			since,
			budgetUsd: budget,
		};
	}
}
