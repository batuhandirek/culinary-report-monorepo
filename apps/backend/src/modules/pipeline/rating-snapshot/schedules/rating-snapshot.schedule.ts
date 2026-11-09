import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableSchedule } from 'src/modules/durable-workflows/decorators/durable-schedule.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow } from 'src/modules/durable-workflows/util/durable-steps.js';

import { periodAt, startForCronCities } from '../../shared/util/operations.js';
import {
	RATING_SNAPSHOT_WEEK,
	RATING_SNAPSHOT_WEEK_CRON,
} from '../constants/rating-snapshot.constant.js';
import { RatingSnapshotWorkflow } from '../workflows/rating-snapshot.workflow.js';

/** When `RatingSnapshotWorkflow` runs by itself: one run per cron city and period, under its one id */
@Injectable()
export class RatingSnapshotSchedule {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly workflow: RatingSnapshotWorkflow,
	) {}

	// Tuesdays
	@DurableSchedule('rating-snapshot.week', RATING_SNAPSHOT_WEEK_CRON)
	@EnsureRequestContext()
	async weekly(): Promise<void> {
		const now = await durableNow(this.durable);
		await startForCronCities(
			this.durable,
			this.cityService,
			this.workflow.week,
			RATING_SNAPSHOT_WEEK,
			periodAt('week', now),
		);
	}
}
