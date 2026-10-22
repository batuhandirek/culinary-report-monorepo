import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CitySourceKindEnum } from 'src/modules/cities/entities/city-source.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { OnCron } from 'src/modules/pgboss/decorators/on-cron.decorator.js';

import { PipelineStepEnum } from '../constants/pipeline.constant.js';
import { PipelineService } from '../services/pipeline.service.js';
import { WEEKLY_LISTENING_CRON } from '../util/monthly-schedule.js';

@Injectable()
export class WeeklyListeningCron {
	constructor(
		private readonly orm: MikroORM,
		private readonly pipelineService: PipelineService,
		private readonly cityService: CityService,
	) {}

	// Sundays (`WEEKLY_LISTENING_CRON`): per city the monthly cron covers, a
	// `SCRAPE_TIKTOK_RECENT` run where it has TikTok sources, a `SCRAPE_INSTAGRAM_REELS` run
	// where Instagram is on and a `SCRAPE_BLOGS` run where it has blogs, then the free
	// `EXTRACT_MENTIONS` and `MATCH_MENTIONS` (the queue runs oldest first, so they follow). TikTok hashtag feeds ignore dates and its search is by
	// relevance, so only listening through the month finds the month's videos
	@OnCron('weekly-listening', WEEKLY_LISTENING_CRON)
	@EnsureRequestContext()
	async handleCron() {
		await this.queueAll(new Date());
	}

	async queueAll(now: Date): Promise<void> {
		// The run's month is a label: the steps keep the last `WEEKLY_LISTENING_DAYS` of posts
		const month = now.toISOString().slice(0, 7);
		for (const city of await this.cityService.forMonthlyCron()) {
			const [hashtags, searches, blogs] = await Promise.all([
				this.cityService.enabledValues(city.id, CitySourceKindEnum.TIKTOK_HASHTAG),
				this.cityService.enabledValues(city.id, CitySourceKindEnum.TIKTOK_SEARCH),
				this.cityService.enabledValues(city.id, CitySourceKindEnum.BLOG),
			]);
			const steps = [
				...(hashtags.length || searches.length ? [PipelineStepEnum.SCRAPE_TIKTOK_RECENT] : []),
				...(city.instagramEnabled ? [PipelineStepEnum.SCRAPE_INSTAGRAM_REELS] : []),
				...(blogs.length ? [PipelineStepEnum.SCRAPE_BLOGS] : []),
			];
			if (!steps.length) continue;
			for (const step of [...steps, PipelineStepEnum.EXTRACT_MENTIONS, PipelineStepEnum.MATCH_MENTIONS])
				await this.pipelineService.queue(city.id, step, month);
		}
	}
}
