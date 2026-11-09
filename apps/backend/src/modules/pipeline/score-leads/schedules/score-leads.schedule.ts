import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableSchedule } from 'src/modules/durable-workflows/decorators/durable-schedule.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow } from 'src/modules/durable-workflows/util/durable-steps.js';

import { periodAt, startForCronCities } from '../../shared/util/operations.js';
import { SCORE_LEADS_MONTH, SCORE_LEADS_MONTH_CRON } from '../constants/score-leads.constant.js';
import { ScoreLeadsWorkflow } from '../workflows/score-leads.workflow.js';

/** When `ScoreLeadsWorkflow` runs by itself: one run per cron city and period, under its one id */
@Injectable()
export class ScoreLeadsSchedule {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly workflow: ScoreLeadsWorkflow,
	) {}

	// The 2nd: the month that just ended
	@DurableSchedule('score-leads.month', SCORE_LEADS_MONTH_CRON)
	@EnsureRequestContext()
	async monthly(): Promise<void> {
		const now = await durableNow(this.durable);
		await startForCronCities(
			this.durable,
			this.cityService,
			this.workflow.month,
			SCORE_LEADS_MONTH,
			periodAt('month', now),
		);
	}
}
