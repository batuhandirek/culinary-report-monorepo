import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { OnCron } from 'src/modules/pgboss/decorators/on-cron.decorator.js';

import { PipelineStepEnum } from '../constants/pipeline.constant.js';
import { PipelineService } from '../services/pipeline.service.js';
import { PROFILE_TRACK_CRON } from '../util/monthly-schedule.js';

@Injectable()
export class ProfileTrackCron {
	constructor(
		private readonly orm: MikroORM,
		private readonly pipelineService: PipelineService,
		private readonly cityService: CityService,
	) {}

	// Wednesdays (`PROFILE_TRACK_CRON`): one `TRACK_PROFILES` run per city the monthly cron
	// covers. Each account is due two weeks after its last profile, so a run takes about half
	@OnCron('profile-track', PROFILE_TRACK_CRON)
	@EnsureRequestContext()
	async handleCron() {
		await this.queueAll(new Date());
	}

	async queueAll(now: Date): Promise<void> {
		// The run's month is a label: the step takes the accounts due today
		const month = now.toISOString().slice(0, 7);
		for (const city of await this.cityService.forMonthlyCron())
			await this.pipelineService.queueOnce(city.id, PipelineStepEnum.TRACK_PROFILES, month, 24, now);
	}
}
