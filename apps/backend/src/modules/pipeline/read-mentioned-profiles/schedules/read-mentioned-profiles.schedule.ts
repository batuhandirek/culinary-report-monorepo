import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableSchedule } from 'src/modules/durable-workflows/decorators/durable-schedule.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow } from 'src/modules/durable-workflows/util/durable-steps.js';

import { periodAt, startForCronCities } from '../../shared/util/operations.js';
import {
	READ_MENTIONED_PROFILES_WEEK,
	READ_MENTIONED_PROFILES_WEEK_CRON,
} from '../constants/read-mentioned-profiles.constant.js';
import { ReadMentionedProfilesWorkflow } from '../workflows/read-mentioned-profiles.workflow.js';

/** Sundays: one `ReadMentionedProfilesWorkflow.week` run per cron city, under its one id */
@Injectable()
export class ReadMentionedProfilesSchedule {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly workflow: ReadMentionedProfilesWorkflow,
	) {}

	@DurableSchedule('read-mentioned-profiles.week', READ_MENTIONED_PROFILES_WEEK_CRON)
	@EnsureRequestContext()
	async weekly(): Promise<void> {
		const now = await durableNow(this.durable);
		await startForCronCities(
			this.durable,
			this.cityService,
			this.workflow.week,
			READ_MENTIONED_PROFILES_WEEK,
			periodAt('week', now),
		);
	}
}
