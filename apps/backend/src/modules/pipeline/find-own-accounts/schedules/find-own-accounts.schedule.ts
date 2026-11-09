import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableSchedule } from 'src/modules/durable-workflows/decorators/durable-schedule.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow } from 'src/modules/durable-workflows/util/durable-steps.js';

import { periodAt, startForCronCities } from '../../shared/util/operations.js';
import {
	FIND_OWN_ACCOUNTS_WEEK,
	FIND_OWN_ACCOUNTS_WEEK_CRON,
} from '../constants/find-own-accounts.constant.js';
import { FindOwnAccountsWorkflow } from '../workflows/find-own-accounts.workflow.js';

/** When `FindOwnAccountsWorkflow` runs by itself: one run per cron city and period, under its one id */
@Injectable()
export class FindOwnAccountsSchedule {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly workflow: FindOwnAccountsWorkflow,
	) {}

	// Sundays: after the week is looked up and matched
	@DurableSchedule('find-own-accounts.week', FIND_OWN_ACCOUNTS_WEEK_CRON)
	@EnsureRequestContext()
	async weekly(): Promise<void> {
		const now = await durableNow(this.durable);
		await startForCronCities(
			this.durable,
			this.cityService,
			this.workflow.week,
			FIND_OWN_ACCOUNTS_WEEK,
			periodAt('week', now),
		);
	}
}
