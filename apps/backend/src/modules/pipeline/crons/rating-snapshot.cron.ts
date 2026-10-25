import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { OnCron } from 'src/modules/pgboss/decorators/on-cron.decorator.js';

import { PipelineStepEnum } from '../constants/pipeline.constant.js';
import { PipelineService } from '../services/pipeline.service.js';
import { RATING_SNAPSHOT_CRON } from '../util/monthly-schedule.js';

@Injectable()
export class RatingSnapshotCron {
	constructor(
		private readonly orm: MikroORM,
		private readonly pipelineService: PipelineService,
		private readonly cityService: CityService,
	) {}

	// Tuesdays and Fridays (`RATING_SNAPSHOT_CRON`): one `SNAPSHOT_RATINGS` run per city the
	// monthly cron covers
	@OnCron('rating-snapshot', RATING_SNAPSHOT_CRON)
	@EnsureRequestContext()
	async handleCron() {
		await this.queueAll(new Date());
	}

	async queueAll(now: Date): Promise<void> {
		// The run's month is a label: the step snapshots today's venues
		const month = now.toISOString().slice(0, 7);
		for (const city of await this.cityService.forMonthlyCron())
			await this.pipelineService.queue(city.id, PipelineStepEnum.SNAPSHOT_RATINGS, month);
	}
}
