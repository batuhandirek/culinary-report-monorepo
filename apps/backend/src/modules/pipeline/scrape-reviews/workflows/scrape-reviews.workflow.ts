import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import _ from 'lodash';

import { runActorCallRef } from 'src/modules/apify/actors/actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { stepBudgetUsd } from 'src/modules/cities/util/city.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow } from 'src/modules/durable-workflows/util/durable-steps.js';
import { TRIPADVISOR_BUDGET_SHARE } from 'src/modules/venues/constants/review-scrape.constant.js';
import { type ReportMonthPlan, ReviewService } from 'src/modules/venues/services/review.service.js';
import {
	type TripadvisorMonthPlan,
	type TripadvisorPagesPlan,
	TripadvisorReviewService,
} from 'src/modules/venues/services/tripadvisor-review.service.js';

import { ReviewsWorkflow } from '../../atoms/reviews/workflows/reviews.workflow.js';
import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import { FILL_COMPETITORS_MONTH } from '../../fill-competitors/constants/fill-competitors.constant.js';
import { FillCompetitorsWorkflow } from '../../fill-competitors/workflows/fill-competitors.workflow.js';
import { ReportBrandsService } from '../../shared/services/report-brands.service.js';
import { runOperation, workflowName } from '../../shared/util/operations.js';

/** What the month's Google side came to, as the `SCRAPE_REVIEWS` step reports it beside TripAdvisor's */
export interface GoogleReviewsSummary {
	/** Reviews saved by every run, the backfill's too */
	saved: number;
	/** Venues new to the set, fetched from `backfillSince` */
	backfilled: number;
	backfillSince?: string;
	backfillSaved?: number;
	branches: number;
	competitors: number;
}

/**
 * The month's reviews of every report branch (a chain's report compares them) and of their
 * competitors, inside one budget: a tenth to the branches' TripAdvisor side (the pages of the
 * venues never searched found by a Google search, then the month's reviews: two actor children of
 * the run), the rest to Google, where a venue new to the set starts six months earlier
 * (`ReviewService.planReportMonth`), every Google run a `reviews.run` child. The competitors must
 * be picked first, so it calls that.
 */
@Injectable()
export class ScrapeReviewsWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly apifyService: ApifyService,
		private readonly cityService: CityService,
		private readonly reportBrands: ReportBrandsService,
		private readonly reviewService: ReviewService,
		private readonly tripadvisorReviewService: TripadvisorReviewService,
		private readonly fillCompetitors: FillCompetitorsWorkflow,
		private readonly reviews: ReviewsWorkflow,
	) {}

	@DurableWorkflow({ name: workflowName('scrape-reviews', 'month') })
	@EnsureRequestContext()
	async month(cityId: string, month: string) {
		await runOperation(
			this.durable,
			this.fillCompetitors.month,
			FILL_COMPETITORS_MONTH,
			cityId,
			month,
		);
		const now = await durableNow(this.durable);
		const plan = await this.planReviews(cityId, month);
		const results = await this.reviews.callAll([...plan.month, ...plan.backfill], now);
		const backfillSaved = _.sumBy(results.slice(plan.month.length), r => r.saved);
		const google: GoogleReviewsSummary = {
			saved: _.sumBy(results, r => r.saved),
			backfilled: plan.backfilled,
			...(plan.backfillSince && { backfillSince: plan.backfillSince, backfillSaved }),
			branches: plan.branches,
			competitors: plan.competitors,
		};
		// TripAdvisor: the pages of the branches never searched, then the month's reviews
		const pagesPlan = await this.planTripadvisorPages(cityId, month, plan.tripadvisorUsd / 2);
		const pages =
			pagesPlan.call ? await runActorCallRef(this.apifyService, pagesPlan.call) : null;
		const found = await this.saveTripadvisorPages(
			cityId,
			pagesPlan,
			pages?.recordId ?? null,
			now,
		);
		const monthPlan = await this.planTripadvisorMonth(cityId, month, plan.tripadvisorUsd / 2);
		const reviews =
			monthPlan.call ? await runActorCallRef(this.apifyService, monthPlan.call) : null;
		return this.scrapeReviews(month, monthPlan, reviews?.recordId ?? null, google, found);
	}

	/** The scope's Google runs (branches first, then competitors) on the budget less TripAdvisor's share */
	@DurableStep({ name: 'plan reviews' })
	private async planReviews(
		cityId: string,
		month: string,
	): Promise<
		ReportMonthPlan & { branches: number; competitors: number; tripadvisorUsd: number }
	> {
		const city = await this.cityService.getById(cityId);
		const scope = await this.reportBrands.scope(city, month);
		const budgetUsd = stepBudgetUsd(city, PipelineStepEnum.SCRAPE_REVIEWS);
		const tripadvisorUsd = budgetUsd * TRIPADVISOR_BUDGET_SHARE;
		const plan = await this.reviewService.planReportMonth(
			month,
			[...scope.branches, ...scope.competitors].map(v => v.id),
			budgetUsd - tripadvisorUsd,
		);
		return {
			...plan,
			branches: scope.branches.length - scope.brands.length,
			competitors: scope.competitors.length,
			tripadvisorUsd,
		};
	}

	/** The Google search for the TripAdvisor page of every branch never searched */
	@DurableStep({ name: 'plan tripadvisor pages' })
	private async planTripadvisorPages(
		cityId: string,
		month: string,
		budgetUsd: number,
	): Promise<TripadvisorPagesPlan> {
		const city = await this.cityService.getById(cityId);
		const scope = await this.reportBrands.scope(city, month);
		return this.tripadvisorReviewService.planPages(city, scope.branches, budgetUsd);
	}

	/** Each searched branch's page from the result pages, every one stamped */
	@DurableStep({ name: 'save tripadvisor pages' })
	private async saveTripadvisorPages(
		cityId: string,
		plan: TripadvisorPagesPlan,
		recordId: string | null,
		now: Date,
	) {
		return this.tripadvisorReviewService.savePages(
			await this.cityService.getById(cityId),
			plan,
			recordId,
			now,
		);
	}

	/** The month's TripAdvisor reviews of every branch with a page */
	@DurableStep({ name: 'plan tripadvisor reviews' })
	private async planTripadvisorMonth(
		cityId: string,
		month: string,
		budgetUsd: number,
	): Promise<TripadvisorMonthPlan> {
		const city = await this.cityService.getById(cityId);
		const scope = await this.reportBrands.scope(city, month);
		return this.tripadvisorReviewService.planMonth(
			month,
			scope.branches.map(v => v.id),
			budgetUsd,
		);
	}

	/** The TripAdvisor reviews stored next to Google's, and the month's summary */
	@DurableStep({ name: PipelineStepEnum.SCRAPE_REVIEWS })
	private async scrapeReviews(
		month: string,
		plan: TripadvisorMonthPlan,
		recordId: string | null,
		google: GoogleReviewsSummary,
		pages: { searched: number; found: number },
	) {
		const saved = await this.tripadvisorReviewService.saveMonth(month, plan, recordId);
		return { ...google, tripadvisor: { ...pages, saved } };
	}
}
