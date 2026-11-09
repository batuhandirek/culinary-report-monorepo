import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableSchedule } from 'src/modules/durable-workflows/decorators/durable-schedule.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow } from 'src/modules/durable-workflows/util/durable-steps.js';

import { periodAt, startForCronCities } from '../../shared/util/operations.js';
import {
	SCRAPE_REVIEWS_MONTH,
	SCRAPE_REVIEWS_MONTH_CRON,
} from '../constants/scrape-reviews.constant.js';
import { ScrapeReviewsWorkflow } from '../workflows/scrape-reviews.workflow.js';

/** When `ScrapeReviewsWorkflow` runs by itself: one run per cron city and period, under its one id */
@Injectable()
export class ScrapeReviewsSchedule {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly workflow: ScrapeReviewsWorkflow,
	) {}

	// The 2nd: the month that just ended
	@DurableSchedule('scrape-reviews.month', SCRAPE_REVIEWS_MONTH_CRON)
	@EnsureRequestContext()
	async monthly(): Promise<void> {
		const now = await durableNow(this.durable);
		await startForCronCities(
			this.durable,
			this.cityService,
			this.workflow.month,
			SCRAPE_REVIEWS_MONTH,
			periodAt('month', now),
		);
	}
}
