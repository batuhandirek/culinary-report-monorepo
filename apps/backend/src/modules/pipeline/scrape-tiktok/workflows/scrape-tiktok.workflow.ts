import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { stepBudgetUsd } from 'src/modules/cities/util/city.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow } from 'src/modules/durable-workflows/util/durable-steps.js';
import { SocialScrapeService } from 'src/modules/social/services/social-scrape.service.js';

import type { TiktokSearchCall } from '../../atoms/tiktok-search/util/tiktok-search-input.js';
import { TiktokSearchWorkflow } from '../../atoms/tiktok-search/workflows/tiktok-search.workflow.js';
import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import { DAY_MS, WEEK_DAYS } from '../../shared/constants/cadence.constant.js';
import { workflowName } from '../../shared/util/operations.js';

/** What one run did: the queries searched and the posts kept */
export interface ScrapeTiktokResult {
	queries: number;
	found: number;
	saved: number;
}

/**
 * The city's TikTok searches and hashtag words (a hashtag's own feed has no date filter, so its
 * word is searched): every week over the week, and once a month over the month for what the
 * weeks missed. The search is by relevance, so only listening through the month finds the month.
 * The one run is a `tiktok-search.run` child between the plan step and the result.
 */
@Injectable()
export class ScrapeTiktokWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly socialScrapeService: SocialScrapeService,
		private readonly tiktokSearch: TiktokSearchWorkflow,
	) {}

	@DurableWorkflow({ name: workflowName('scrape-tiktok', 'month') })
	@EnsureRequestContext()
	async month(cityId: string, month: string): Promise<ScrapeTiktokResult> {
		return this.search(cityId, await this.planMonth(cityId, month));
	}

	@DurableWorkflow({ name: workflowName('scrape-tiktok', 'week') })
	@EnsureRequestContext()
	async week(cityId: string, _week: string): Promise<ScrapeTiktokResult> {
		const now = await durableNow(this.durable);
		return this.search(cityId, await this.planWeek(cityId, now));
	}

	private async search(
		cityId: string,
		plan: TiktokSearchCall | null,
	): Promise<ScrapeTiktokResult> {
		if (!plan) return { queries: 0, found: 0, saved: 0 };
		const result = await this.tiktokSearch.call({ ...plan, cityId });
		return { queries: plan.queries.length, found: result.found, saved: result.saved };
	}

	/** The month's searches, 50 a query, kept from the month's start */
	@DurableStep({ name: 'plan month' })
	private async planMonth(cityId: string, month: string): Promise<TiktokSearchCall | null> {
		const city = await this.cityService.getById(cityId);
		return this.socialScrapeService.planCityTikTok(city, {
			since: `${month}-01T00:00:00.000Z`,
			perSource: 50,
			budgetUsd: stepBudgetUsd(city, PipelineStepEnum.SCRAPE_TIKTOK),
			window: 'MONTH',
		});
	}

	/** The week's searches, 30 a query, the last `WEEK_DAYS` kept */
	@DurableStep({ name: 'plan week' })
	private async planWeek(cityId: string, now: Date): Promise<TiktokSearchCall | null> {
		const city = await this.cityService.getById(cityId);
		return this.socialScrapeService.planCityTikTok(city, {
			since: new Date(now.getTime() - WEEK_DAYS * DAY_MS).toISOString(),
			perSource: 30,
			budgetUsd: stepBudgetUsd(city, PipelineStepEnum.SCRAPE_TIKTOK_RECENT),
			window: 'WEEK',
		});
	}
}
