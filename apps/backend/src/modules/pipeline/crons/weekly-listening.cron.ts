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
	// where Instagram is on, a `SCRAPE_BLOGS` run where it has blogs and a
	// `SCRAPE_ACCOUNTS_RECENT` run (the watched profiles' week: `AccountWatchService`), then the free
	// `EXTRACT_MENTIONS` and `MATCH_MENTIONS`, then `LOOKUP_VENUES` and `MATCH_MENTIONS` again
	// (the queue runs oldest first, so they follow), and last `FIND_OWN_ACCOUNTS` (the brands'
	// accounts on the platform they lack, after matching linked what the week gave). TikTok hashtag feeds ignore dates and its
	// search is by relevance, so only listening through the month finds the month's videos. The
	// lookup puts a place posts named on the map within a week instead of on the 2nd; it pays only
	// for names not searched lately, so a week costs cents
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
				// Every city has watched profiles (its report brands' own accounts at least)
				PipelineStepEnum.SCRAPE_ACCOUNTS_RECENT,
			];
			for (const step of [
				...steps,
				PipelineStepEnum.EXTRACT_MENTIONS,
				PipelineStepEnum.MATCH_MENTIONS,
				PipelineStepEnum.LOOKUP_VENUES,
				PipelineStepEnum.MATCH_MENTIONS,
				PipelineStepEnum.FIND_OWN_ACCOUNTS,
			])
				await this.pipelineService.queue(city.id, step, month);
		}
	}
}
