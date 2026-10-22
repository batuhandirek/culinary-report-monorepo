import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { OnCron } from 'src/modules/pgboss/decorators/on-cron.decorator.js';

import { PipelineStepEnum } from '../constants/pipeline.constant.js';
import { PipelineService } from '../services/pipeline.service.js';
import { INSTAGRAM_RECENT_CRON } from '../util/monthly-schedule.js';

@Injectable()
export class InstagramRecentCron {
	constructor(
		private readonly orm: MikroORM,
		private readonly pipelineService: PipelineService,
		private readonly cityService: CityService,
	) {}

	// Daily (`INSTAGRAM_RECENT_CRON`): per city the monthly cron covers that has Instagram on, a
	// `SCRAPE_INSTAGRAM_RECENT` run, then the free `EXTRACT_MENTIONS` and `MATCH_MENTIONS` (the
	// queue runs oldest first, so they follow it), so the month's mentions are read as it fills
	// instead of all at once on the 2nd. On Apify's Free plan a hashtag gives one page a run, so
	// only a daily run sees a busy tag's whole month
	@OnCron('instagram-recent', INSTAGRAM_RECENT_CRON)
	@EnsureRequestContext()
	async handleCron() {
		await this.queueAll(new Date());
	}

	async queueAll(now: Date): Promise<void> {
		// The run's month is a label: the step keeps the last `INSTAGRAM_RECENT_DAYS` of posts
		const month = now.toISOString().slice(0, 7);
		for (const city of await this.cityService.forMonthlyCron()) {
			if (!city.instagramEnabled) continue;
			for (const step of [
				PipelineStepEnum.SCRAPE_INSTAGRAM_RECENT,
				PipelineStepEnum.EXTRACT_MENTIONS,
				PipelineStepEnum.MATCH_MENTIONS,
			])
				await this.pipelineService.queue(city.id, step, month);
		}
	}
}
