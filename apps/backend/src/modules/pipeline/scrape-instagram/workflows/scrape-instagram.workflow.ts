import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import _ from 'lodash';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { stepBudgetUsd } from 'src/modules/cities/util/city.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow } from 'src/modules/durable-workflows/util/durable-steps.js';
import { SocialScrapeService } from 'src/modules/social/services/social-scrape.service.js';

import type { InstagramHashtagsCall } from '../../atoms/instagram-hashtags/util/instagram-hashtags-input.js';
import { InstagramHashtagsWorkflow } from '../../atoms/instagram-hashtags/workflows/instagram-hashtags.workflow.js';
import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import { DAY_MS, WEEK_DAYS } from '../../shared/constants/cadence.constant.js';
import { workflowName } from '../../shared/util/operations.js';
import { INSTAGRAM_DAY_KEEP_DAYS } from '../constants/scrape-instagram.constant.js';

/** What the plan step stores: one run per kind, or why none */
interface InstagramScrapePlan {
	calls: InstagramHashtagsCall[];
	skipped?: string;
}

/** What one run did: the runs made and the posts kept */
export interface ScrapeInstagramResult {
	runs: number;
	found: number;
	saved: number;
	skipped?: string;
}

/**
 * The city's Instagram hashtags (nothing where `instagramEnabled` is off). On Apify's Free plan a
 * hashtag gives one page a run, so the month's posts come from the daily run (each tag's newest
 * page) and its reels from the weekly one; the month's own run takes posts and reels once more.
 * Each run is an `instagram-hashtags.run` child, the month's two one after the other.
 */
@Injectable()
export class ScrapeInstagramWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly socialScrapeService: SocialScrapeService,
		private readonly instagramHashtags: InstagramHashtagsWorkflow,
	) {}

	@DurableWorkflow({ name: workflowName('scrape-instagram', 'month') })
	@EnsureRequestContext()
	async month(cityId: string, month: string): Promise<ScrapeInstagramResult> {
		return this.scrape(cityId, await this.planMonth(cityId, month));
	}

	@DurableWorkflow({ name: workflowName('scrape-instagram', 'week') })
	@EnsureRequestContext()
	async week(cityId: string, _week: string): Promise<ScrapeInstagramResult> {
		const now = await durableNow(this.durable);
		return this.scrape(cityId, await this.planReels(cityId, now));
	}

	@DurableWorkflow({ name: workflowName('scrape-instagram', 'day') })
	@EnsureRequestContext()
	async day(cityId: string, _day: string): Promise<ScrapeInstagramResult> {
		const now = await durableNow(this.durable);
		return this.scrape(cityId, await this.planNewest(cityId, now));
	}

	private async scrape(
		cityId: string,
		plan: InstagramScrapePlan,
	): Promise<ScrapeInstagramResult> {
		const results = await this.instagramHashtags.callEach(plan.calls, cityId);
		return {
			runs: results.length,
			found: _.sumBy(results, r => r.found),
			saved: _.sumBy(results, r => r.saved),
			...(plan.skipped && { skipped: plan.skipped }),
		};
	}

	/** Posts on three quarters of the budget, reels on a quarter, kept from the month's start */
	@DurableStep({ name: 'plan month' })
	private async planMonth(cityId: string, month: string): Promise<InstagramScrapePlan> {
		const city = await this.cityService.getById(cityId);
		return this.socialScrapeService.planCityInstagram(city, {
			since: `${month}-01T00:00:00.000Z`,
			perSource: 300,
			budgetUsd: stepBudgetUsd(city, PipelineStepEnum.SCRAPE_INSTAGRAM),
		});
	}

	/** Each hashtag's top reels of the week */
	@DurableStep({ name: 'plan reels' })
	private async planReels(cityId: string, now: Date): Promise<InstagramScrapePlan> {
		const city = await this.cityService.getById(cityId);
		return this.socialScrapeService.planCityInstagram(city, {
			since: new Date(now.getTime() - WEEK_DAYS * DAY_MS).toISOString(),
			perSource: 30,
			budgetUsd: stepBudgetUsd(city, PipelineStepEnum.SCRAPE_INSTAGRAM_REELS),
			kinds: ['reels'],
		});
	}

	/** Each hashtag's newest page of posts, the last `INSTAGRAM_DAY_KEEP_DAYS` kept */
	@DurableStep({ name: 'plan newest' })
	private async planNewest(cityId: string, now: Date): Promise<InstagramScrapePlan> {
		const city = await this.cityService.getById(cityId);
		return this.socialScrapeService.planCityInstagram(city, {
			since: new Date(now.getTime() - INSTAGRAM_DAY_KEEP_DAYS * DAY_MS).toISOString(),
			perSource: 100,
			budgetUsd: stepBudgetUsd(city, PipelineStepEnum.SCRAPE_INSTAGRAM_RECENT),
			kinds: ['posts'],
		});
	}
}
