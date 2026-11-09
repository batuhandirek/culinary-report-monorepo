import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableSchedule } from 'src/modules/durable-workflows/decorators/durable-schedule.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow } from 'src/modules/durable-workflows/util/durable-steps.js';

import { periodAt, startForCronCities } from '../../shared/util/operations.js';
import { CREATOR_WATCH_DAY, CREATOR_WATCH_DAY_CRON } from '../constants/creator-watch.constant.js';
import { CreatorWatchWorkflow } from '../workflows/creator-watch.workflow.js';

/**
 * The daily cron of the watched creators: one `CreatorWatchWorkflow.day` run per cron city. TikTok
 * pays per new video, so a daily run costs what a weekly one would.
 */
@Injectable()
export class CreatorWatchSchedule {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly workflow: CreatorWatchWorkflow,
	) {}

	@DurableSchedule('creator-watch.day', CREATOR_WATCH_DAY_CRON)
	@EnsureRequestContext()
	async daily(): Promise<void> {
		const now = await durableNow(this.durable);
		await startForCronCities(
			this.durable,
			this.cityService,
			this.workflow.day,
			CREATOR_WATCH_DAY,
			periodAt('day', now),
		);
	}
}
