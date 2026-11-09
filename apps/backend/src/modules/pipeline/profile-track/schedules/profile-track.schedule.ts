import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableSchedule } from 'src/modules/durable-workflows/decorators/durable-schedule.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow } from 'src/modules/durable-workflows/util/durable-steps.js';

import { periodAt, startForCronCities } from '../../shared/util/operations.js';
import {
	PROFILE_TRACK_WEEK,
	PROFILE_TRACK_WEEK_CRON,
} from '../constants/profile-track.constant.js';
import { ProfileTrackWorkflow } from '../workflows/profile-track.workflow.js';

/** When `ProfileTrackWorkflow` runs by itself: one run per cron city and period, under its one id */
@Injectable()
export class ProfileTrackSchedule {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly workflow: ProfileTrackWorkflow,
	) {}

	// Wednesdays
	@DurableSchedule('profile-track.week', PROFILE_TRACK_WEEK_CRON)
	@EnsureRequestContext()
	async weekly(): Promise<void> {
		const now = await durableNow(this.durable);
		await startForCronCities(
			this.durable,
			this.cityService,
			this.workflow.week,
			PROFILE_TRACK_WEEK,
			periodAt('week', now),
		);
	}
}
