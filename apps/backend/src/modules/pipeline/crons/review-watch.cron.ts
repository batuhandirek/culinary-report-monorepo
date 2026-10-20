import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { OnCron } from 'src/modules/pgboss/decorators/on-cron.decorator.js';

import { PipelineStepEnum } from '../constants/pipeline.constant.js';
import { PipelineService } from '../services/pipeline.service.js';
import { REVIEW_WATCH_CRON } from '../util/monthly-schedule.js';

@Injectable()
export class ReviewWatchCron {
	constructor(
		private readonly orm: MikroORM,
		private readonly pipelineService: PipelineService,
		private readonly cityService: CityService,
	) {}

	// Every Monday (`REVIEW_WATCH_CRON`): one `WATCH_REVIEWS` run per city the monthly cron
	// covers, only where a venue subscribed, so a city without subscribers leaves no run behind
	@OnCron('review-watch', REVIEW_WATCH_CRON)
	@EnsureRequestContext()
	async handleCron() {
		// The run's month is a label here: the step looks back ten days from when it runs
		const month = new Date().toISOString().slice(0, 7);
		for (const city of await this.cityService.forMonthlyCron()) {
			if ((await this.pipelineService.subscribedVenues(city)).length === 0) continue;
			await this.pipelineService.queue(city.id, PipelineStepEnum.WATCH_REVIEWS, month);
		}
	}
}
