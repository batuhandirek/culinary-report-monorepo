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
import { ReviewService } from 'src/modules/venues/services/review.service.js';

import type { ReviewsCall } from '../../atoms/reviews/util/reviews-input.js';
import { ReviewsWorkflow } from '../../atoms/reviews/workflows/reviews.workflow.js';
import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import {
	readReviewsOfCity,
	ReadReviewsWorkflow,
} from '../../read-reviews/workflows/read-reviews.workflow.js';
import { DAY_MS } from '../../shared/constants/cadence.constant.js';
import { ReportBrandsService } from '../../shared/services/report-brands.service.js';
import { workflowName } from '../../shared/util/operations.js';
import { REVIEW_WATCH_DAYS } from '../constants/review-watch.constant.js';

/**
 * The paying customers' new reviews every week (`REVIEW_WATCH_DAYS` back, whatever the month;
 * every fetch a `reviews.run` child), read, then one alert per written review of 3 stars or fewer
 * that is unanswered and not alerted yet (outreach mails it). A city without
 * subscribers does nothing.
 */
@Injectable()
export class ReviewWatchWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly reportBrands: ReportBrandsService,
		private readonly reviewService: ReviewService,
		private readonly readReviews: ReadReviewsWorkflow,
		private readonly reviews: ReviewsWorkflow,
	) {}

	@DurableWorkflow({ name: workflowName('review-watch', 'week') })
	@EnsureRequestContext()
	async week(cityId: string, _week: string) {
		const now = await durableNow(this.durable);
		const since = new Date(now.getTime() - REVIEW_WATCH_DAYS * DAY_MS);
		const venueIds = await this.subscribedVenues(cityId);
		if (!venueIds.length) return { venues: 0 };
		const runs = await this.planReviews(cityId, venueIds, since);
		const saved = _.sumBy(await this.reviews.callAll(runs, now), r => r.saved);
		const read = await readReviewsOfCity(this.durable, this.readReviews, cityId);
		const alerted = await this.claimAlerts(venueIds, since);
		return { venues: venueIds.length, saved, read, alerted };
	}

	/** The city's open branches of won brands */
	@DurableStep({ name: 'subscribed venues' })
	private async subscribedVenues(cityId: string): Promise<string[]> {
		const city = await this.cityService.getById(cityId);
		return (await this.reportBrands.subscribedVenues(city)).map(v => v.id);
	}

	/** The subscribers' reviews since `since`, or since their last fetch when later, on the watch's budget */
	@DurableStep({ name: 'plan reviews' })
	private async planReviews(
		cityId: string,
		venueIds: string[],
		since: Date,
	): Promise<ReviewsCall[]> {
		const city = await this.cityService.getById(cityId);
		return this.reviewService.planRecent(
			venueIds,
			since,
			stepBudgetUsd(city, PipelineStepEnum.WATCH_REVIEWS),
		);
	}

	/** One `review-alert` per new critical unanswered review, stamped so it alerts once */
	@DurableStep({ name: 'alerts' })
	private async claimAlerts(venueIds: string[], since: Date) {
		return this.reviewService.claimAlerts(venueIds, since);
	}
}
