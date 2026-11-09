import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableSchedule } from 'src/modules/durable-workflows/decorators/durable-schedule.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow } from 'src/modules/durable-workflows/util/durable-steps.js';

import { periodAt, startForCronCities } from '../../shared/util/operations.js';
import {
	SCRAPE_ACCOUNTS_MONTH,
	SCRAPE_ACCOUNTS_MONTH_CRON,
	SCRAPE_ACCOUNTS_WEEK,
	SCRAPE_ACCOUNTS_WEEK_CRON,
} from '../constants/scrape-accounts.constant.js';
import { ScrapeAccountsWorkflow } from '../workflows/scrape-accounts.workflow.js';

/** When `ScrapeAccountsWorkflow` runs by itself: one run per cron city and period, under its one id */
@Injectable()
export class ScrapeAccountsSchedule {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly workflow: ScrapeAccountsWorkflow,
	) {}

	// The 2nd: the month that just ended
	@DurableSchedule('scrape-accounts.month', SCRAPE_ACCOUNTS_MONTH_CRON)
	@EnsureRequestContext()
	async monthly(): Promise<void> {
		const now = await durableNow(this.durable);
		await startForCronCities(
			this.durable,
			this.cityService,
			this.workflow.month,
			SCRAPE_ACCOUNTS_MONTH,
			periodAt('month', now),
		);
	}

	// Sundays: the week
	@DurableSchedule('scrape-accounts.week', SCRAPE_ACCOUNTS_WEEK_CRON)
	@EnsureRequestContext()
	async weekly(): Promise<void> {
		const now = await durableNow(this.durable);
		await startForCronCities(
			this.durable,
			this.cityService,
			this.workflow.week,
			SCRAPE_ACCOUNTS_WEEK,
			periodAt('week', now),
		);
	}
}
