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
	// `SCRAPE_TIKTOK_RECENT` run where it has TikTok sources (searches and hashtag words, searched),
	// a `SCRAPE_INSTAGRAM_REELS` run where Instagram is on, a `SCRAPE_BLOGS` run where it has blogs,
	// a `SCRAPE_ACCOUNTS_RECENT` run (every brand's own accounts: `AccountWatchService`) and a
	// `SCRAPE_VENUE_SOCIAL_RECENT` run (the report brands', their competitors' and the open
	// prospects' names searched), then `LOOKUP_VENUES` (the queue runs oldest first, so it follows),
	// and last `FIND_OWN_ACCOUNTS` (the brands' accounts on the platform they lack, after matching
	// linked what the week gave). TikTok's search is by relevance over the week, so only
	// listening through the month finds the month's videos. The
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
				// Every city has watched profiles (its brands' own accounts)
				PipelineStepEnum.SCRAPE_ACCOUNTS_RECENT,
				// The last finished month's report brands, their competitors and the open prospects by name
				PipelineStepEnum.SCRAPE_VENUE_SOCIAL_RECENT,
			];
			// The scrapes, then the steps that read what the reading made of them: each waits for
			// the posts to be read (`READ_GATED_STEPS`)
			for (const step of [...steps, PipelineStepEnum.LOOKUP_VENUES, PipelineStepEnum.FIND_OWN_ACCOUNTS])
				await this.pipelineService.queueOnce(city.id, step, month, 24, now);
		}
	}
}
