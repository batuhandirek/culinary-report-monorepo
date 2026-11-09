import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableSchedule } from 'src/modules/durable-workflows/decorators/durable-schedule.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow } from 'src/modules/durable-workflows/util/durable-steps.js';

import { periodAt, startForCronCities } from '../../shared/util/operations.js';
import {
	SCRAPE_VENUE_SOCIAL_MONTH,
	SCRAPE_VENUE_SOCIAL_MONTH_CRON,
	SCRAPE_VENUE_SOCIAL_WEEK,
	SCRAPE_VENUE_SOCIAL_WEEK_CRON,
} from '../constants/scrape-venue-social.constant.js';
import { ScrapeVenueSocialWorkflow } from '../workflows/scrape-venue-social.workflow.js';

/** When `ScrapeVenueSocialWorkflow` runs by itself: one run per cron city and period, under its one id */
@Injectable()
export class ScrapeVenueSocialSchedule {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly workflow: ScrapeVenueSocialWorkflow,
	) {}

	// The 2nd: the month that just ended
	@DurableSchedule('scrape-venue-social.month', SCRAPE_VENUE_SOCIAL_MONTH_CRON)
	@EnsureRequestContext()
	async monthly(): Promise<void> {
		const now = await durableNow(this.durable);
		await startForCronCities(
			this.durable,
			this.cityService,
			this.workflow.month,
			SCRAPE_VENUE_SOCIAL_MONTH,
			periodAt('month', now),
		);
	}

	// Sundays: the week
	@DurableSchedule('scrape-venue-social.week', SCRAPE_VENUE_SOCIAL_WEEK_CRON)
	@EnsureRequestContext()
	async weekly(): Promise<void> {
		const now = await durableNow(this.durable);
		await startForCronCities(
			this.durable,
			this.cityService,
			this.workflow.week,
			SCRAPE_VENUE_SOCIAL_WEEK,
			periodAt('week', now),
		);
	}
}
