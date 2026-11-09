import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableSchedule } from 'src/modules/durable-workflows/decorators/durable-schedule.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow } from 'src/modules/durable-workflows/util/durable-steps.js';

import { periodAt, startForCronCities } from '../../shared/util/operations.js';
import {
	ACCOUNT_FOLLOWERS_DAY,
	ACCOUNT_FOLLOWERS_DAY_CRON,
} from '../constants/account-followers.constant.js';
import { AccountFollowersWorkflow } from '../workflows/account-followers.workflow.js';

/** When `AccountFollowersWorkflow` runs by itself: one run per cron city and period, under its one id */
@Injectable()
export class AccountFollowersSchedule {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly workflow: AccountFollowersWorkflow,
	) {}

	// Daily
	@DurableSchedule('account-followers.day', ACCOUNT_FOLLOWERS_DAY_CRON)
	@EnsureRequestContext()
	async daily(): Promise<void> {
		const now = await durableNow(this.durable);
		await startForCronCities(
			this.durable,
			this.cityService,
			this.workflow.day,
			ACCOUNT_FOLLOWERS_DAY,
			periodAt('day', now),
		);
	}
}
