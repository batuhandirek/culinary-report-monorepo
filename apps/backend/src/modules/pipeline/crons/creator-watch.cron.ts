import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { OnCron } from 'src/modules/pgboss/decorators/on-cron.decorator.js';

import { PipelineStepEnum } from '../constants/pipeline.constant.js';
import { PipelineService } from '../services/pipeline.service.js';
import { CREATOR_WATCH_CRON } from '../util/monthly-schedule.js';

@Injectable()
export class CreatorWatchCron {
	constructor(
		private readonly orm: MikroORM,
		private readonly pipelineService: PipelineService,
		private readonly cityService: CityService,
	) {}

	// Daily (`CREATOR_WATCH_CRON`): per city the monthly cron covers, a `SCRAPE_CREATORS` run (the
	// city's creator sources and the self-kept creator list); the reading pass its end queues reads
	// the posts. TikTok pays per new video, so a daily run costs what a weekly one would
	@OnCron('creator-watch', CREATOR_WATCH_CRON)
	@EnsureRequestContext()
	async handleCron() {
		await this.queueAll(new Date());
	}

	async queueAll(now: Date): Promise<void> {
		// The run's month is a label: the step reads what came since its last run
		const month = now.toISOString().slice(0, 7);
		for (const city of await this.cityService.forMonthlyCron())
			await this.pipelineService.queueOnce(city.id, PipelineStepEnum.SCRAPE_CREATORS, month, 12, now);
	}
}
