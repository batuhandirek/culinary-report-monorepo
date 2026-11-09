import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { DurableSchedule } from 'src/modules/durable-workflows/decorators/durable-schedule.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow } from 'src/modules/durable-workflows/util/durable-steps.js';

import { LANDING_CRON } from '../constants/landing.constant.js';
import { LandingEditionService } from '../services/landing-edition.service.js';
import {
	LandingEditionWorkflow,
	startLandingBuild,
} from '../workflows/landing-edition.workflow.js';

/**
 * Daily (`LANDING_CRON`): a build started for every city whose front page edition is five days
 * old (`LANDING_REFRESH_DAYS`). Daily rather than every fifth day of the month, so the rhythm
 * survives month ends and a missed day.
 */
@Injectable()
export class LandingEditionSchedule {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly service: LandingEditionService,
		private readonly workflow: LandingEditionWorkflow,
	) {}

	@DurableSchedule('landing-editions', LANDING_CRON)
	@EnsureRequestContext()
	async daily(): Promise<void> {
		const now = await durableNow(this.durable);
		const cityIds = await this.durable.step('due cities', () => this.service.dueCityIds(now));
		for (const cityId of cityIds) await startLandingBuild(this.durable, this.workflow, cityId);
	}
}
