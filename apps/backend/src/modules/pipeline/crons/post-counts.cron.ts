import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { OnCron } from 'src/modules/pgboss/decorators/on-cron.decorator.js';

import { PipelineStepEnum } from '../constants/pipeline.constant.js';
import { PipelineService } from '../services/pipeline.service.js';
import { POST_COUNTS_CRON } from '../util/monthly-schedule.js';

@Injectable()
export class PostCountsCron {
	constructor(
		private readonly orm: MikroORM,
		private readonly pipelineService: PipelineService,
		private readonly cityService: CityService,
	) {}

	// Daily (`POST_COUNTS_CRON`): one `REFRESH_POST_COUNTS` run per city the monthly cron covers,
	// so every post's counts are read at seven days whatever day a scrape found it
	@OnCron('post-counts', POST_COUNTS_CRON)
	@EnsureRequestContext()
	async handleCron() {
		await this.queueAll(new Date());
	}

	async queueAll(now: Date): Promise<void> {
		// The run's month is a label: the step reads the posts that are seven days old today
		const month = now.toISOString().slice(0, 7);
		for (const city of await this.cityService.forMonthlyCron())
			await this.pipelineService.queue(city.id, PipelineStepEnum.REFRESH_POST_COUNTS, month);
	}
}
