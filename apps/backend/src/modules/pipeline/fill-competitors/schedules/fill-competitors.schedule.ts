import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableSchedule } from 'src/modules/durable-workflows/decorators/durable-schedule.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow } from 'src/modules/durable-workflows/util/durable-steps.js';

import { periodAt, startForCronCities } from '../../shared/util/operations.js';
import {
	FILL_COMPETITORS_MONTH,
	FILL_COMPETITORS_MONTH_CRON,
} from '../constants/fill-competitors.constant.js';
import { FillCompetitorsWorkflow } from '../workflows/fill-competitors.workflow.js';

/** When `FillCompetitorsWorkflow` runs by itself: one run per cron city and period, under its one id */
@Injectable()
export class FillCompetitorsSchedule {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly workflow: FillCompetitorsWorkflow,
	) {}

	// The 2nd: the month that just ended
	@DurableSchedule('fill-competitors.month', FILL_COMPETITORS_MONTH_CRON)
	@EnsureRequestContext()
	async monthly(): Promise<void> {
		const now = await durableNow(this.durable);
		await startForCronCities(
			this.durable,
			this.cityService,
			this.workflow.month,
			FILL_COMPETITORS_MONTH,
			periodAt('month', now),
		);
	}
}
