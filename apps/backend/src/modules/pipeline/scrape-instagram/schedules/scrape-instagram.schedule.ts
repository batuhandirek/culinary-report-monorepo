import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableSchedule } from 'src/modules/durable-workflows/decorators/durable-schedule.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow } from 'src/modules/durable-workflows/util/durable-steps.js';

import { periodAt, startForCronCities } from '../../shared/util/operations.js';
import {
	SCRAPE_INSTAGRAM_DAY,
	SCRAPE_INSTAGRAM_DAY_CRON,
	SCRAPE_INSTAGRAM_MONTH,
	SCRAPE_INSTAGRAM_MONTH_CRON,
	SCRAPE_INSTAGRAM_WEEK,
	SCRAPE_INSTAGRAM_WEEK_CRON,
} from '../constants/scrape-instagram.constant.js';
import { ScrapeInstagramWorkflow } from '../workflows/scrape-instagram.workflow.js';

/** When `ScrapeInstagramWorkflow` runs by itself: one run per cron city and period, under its one id */
@Injectable()
export class ScrapeInstagramSchedule {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly workflow: ScrapeInstagramWorkflow,
	) {}

	// The 2nd: the month that just ended
	@DurableSchedule('scrape-instagram.month', SCRAPE_INSTAGRAM_MONTH_CRON)
	@EnsureRequestContext()
	async monthly(): Promise<void> {
		const now = await durableNow(this.durable);
		await startForCronCities(
			this.durable,
			this.cityService,
			this.workflow.month,
			SCRAPE_INSTAGRAM_MONTH,
			periodAt('month', now),
		);
	}

	// Sundays: the week's reels
	@DurableSchedule('scrape-instagram.week', SCRAPE_INSTAGRAM_WEEK_CRON)
	@EnsureRequestContext()
	async weekly(): Promise<void> {
		const now = await durableNow(this.durable);
		await startForCronCities(
			this.durable,
			this.cityService,
			this.workflow.week,
			SCRAPE_INSTAGRAM_WEEK,
			periodAt('week', now),
		);
	}

	// Daily: each hashtag's newest page
	@DurableSchedule('scrape-instagram.day', SCRAPE_INSTAGRAM_DAY_CRON)
	@EnsureRequestContext()
	async daily(): Promise<void> {
		const now = await durableNow(this.durable);
		await startForCronCities(
			this.durable,
			this.cityService,
			this.workflow.day,
			SCRAPE_INSTAGRAM_DAY,
			periodAt('day', now),
		);
	}
}
