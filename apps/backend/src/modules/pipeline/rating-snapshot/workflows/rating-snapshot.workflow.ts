import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import _ from 'lodash';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { stepBudgetUsd } from 'src/modules/cities/util/city.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow } from 'src/modules/durable-workflows/util/durable-steps.js';
import {
	type RatingSnapshotPlan,
	RatingSnapshotService,
} from 'src/modules/venues/services/rating-snapshot.service.js';

import { ReviewsWorkflow } from '../../atoms/reviews/workflows/reviews.workflow.js';
import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import { workflowName } from '../../shared/util/operations.js';

/** What the week's fetch came to: the run's result */
export interface RatingSnapshotSummary {
	/** The city's open venues */
	due: number;
	/** Of them, those posts named in the window */
	talked: number;
	/** Venues the budget planned for */
	requested: number;
	/** Reviews saved */
	saved: number;
	/** Venues given the week's rating snapshot */
	snapshots: number;
	/** Venues with nothing new since their last fetch (their newest review is older) */
	upToDate: number;
	/** Venues with a review since their last fetch the runs' caps never reached: they start there again next week */
	missed: number;
}

/**
 * Every open venue's Google reviews since its last fetch and its rating, the venues posts named
 * lately first: one `reviews.run` child per start day, then one more asking the venues that
 * returned nothing for their newest review (`ReviewService.planSnapshot`).
 */
@Injectable()
export class RatingSnapshotWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly ratingSnapshotService: RatingSnapshotService,
		private readonly reviews: ReviewsWorkflow,
	) {}

	@DurableWorkflow({ name: workflowName('rating-snapshot', 'week') })
	@EnsureRequestContext()
	async week(cityId: string, _period: string): Promise<RatingSnapshotSummary> {
		const now = await durableNow(this.durable);
		const plan = await this.plan(cityId, now);
		const results = await this.reviews.callAll(plan.runs, now);
		// The venues that returned nothing: quiet, or never reached by their run's cap
		const returned = new Set(results.flatMap(r => r.returned));
		const quiet = plan.runs.flatMap(({ fetch }) =>
			fetch.mode === 'since' ?
				fetch.placeIds
					.filter(placeId => !returned.has(placeId))
					.map(placeId => ({ placeId, since: fetch.since }))
			:	[],
		);
		const check =
			quiet.length ?
				await this.reviews.call({
					fetch: { mode: 'newest', places: quiet },
					maxCostUsd: plan.reserveUsd,
					purpose: `google-ratings: ${quiet.length} venues without new reviews`,
					now: now.toISOString(),
				})
			:	null;
		return {
			due: plan.due,
			talked: plan.talked,
			requested: plan.requested,
			saved: _.sumBy(results, r => r.saved),
			snapshots: _.sumBy(results, r => r.rated) + (check?.rated ?? 0),
			upToDate: check?.upToDate ?? 0,
			missed: check?.missed ?? 0,
		};
	}

	/** The city's due venues as the budget plans for, each from its last fetch */
	@DurableStep({ name: 'plan' })
	private async plan(cityId: string, now: Date): Promise<RatingSnapshotPlan> {
		const city = await this.cityService.getById(cityId);
		return this.ratingSnapshotService.plan(
			city,
			stepBudgetUsd(city, PipelineStepEnum.SNAPSHOT_RATINGS),
			now,
		);
	}
}
