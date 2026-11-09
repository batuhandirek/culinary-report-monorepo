import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { runActorCallRef } from 'src/modules/apify/actors/actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { stepBudgetUsd } from 'src/modules/cities/util/city.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow } from 'src/modules/durable-workflows/util/durable-steps.js';
import {
	SocialScrapeService,
	type VenuePlacesPlan,
} from 'src/modules/social/services/social-scrape.service.js';
import { previousMonth } from 'src/modules/venues/util/month.js';

import type { TiktokSearchCall } from '../../atoms/tiktok-search/util/tiktok-search-input.js';
import { TiktokSearchWorkflow } from '../../atoms/tiktok-search/workflows/tiktok-search.workflow.js';
import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import { LOOKUP_VENUES_MONTH } from '../../lookup-venues/constants/lookup-venues.constant.js';
import { LookupVenuesWorkflow } from '../../lookup-venues/workflows/lookup-venues.workflow.js';
import { DAY_MS, WEEK_DAYS } from '../../shared/constants/cadence.constant.js';
import { ReportBrandsService } from '../../shared/services/report-brands.service.js';
import { runOperation, workflowName } from '../../shared/util/operations.js';

/** What the month's plan step stores: the brands searched, the TikTok run and the Instagram places run */
interface VenueSocialMonthPlan {
	brands: number;
	since: string;
	tiktok: TiktokSearchCall | null;
	instagram: VenuePlacesPlan;
}

/** What the week's plan step stores: the brands searched and the TikTok run */
interface VenueSocialWeekPlan {
	brands: number;
	tiktok: TiktokSearchCall | null;
}

/**
 * The report brands' posts found by searching their names (one search a brand, carried by its
 * busiest branch). A month's run searches the month's report brands on TikTok (a
 * `tiktok-search.run` child) and reads their Instagram place pages (the location actor, a child
 * of its own) once the month's names are looked up and matched (so the brands are the month's);
 * a week's run searches TikTok over the week for the last finished month's report brands, their
 * competitors and the open prospects.
 */
@Injectable()
export class ScrapeVenueSocialWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly apifyService: ApifyService,
		private readonly cityService: CityService,
		private readonly reportBrands: ReportBrandsService,
		private readonly socialScrapeService: SocialScrapeService,
		private readonly lookupVenues: LookupVenuesWorkflow,
		private readonly tiktokSearch: TiktokSearchWorkflow,
	) {}

	@DurableWorkflow({ name: workflowName('scrape-venue-social', 'month') })
	@EnsureRequestContext()
	async month(cityId: string, month: string) {
		await runOperation(
			this.durable,
			this.lookupVenues.month,
			LOOKUP_VENUES_MONTH,
			cityId,
			month,
		);
		const plan = await this.planMonth(cityId, month);
		const tiktok =
			plan.tiktok ? await this.tiktokSearch.call({ ...plan.tiktok, cityId }) : null;
		const places =
			plan.instagram.call ?
				await runActorCallRef(this.apifyService, plan.instagram.call)
			:	null;
		return this.savePlaces(cityId, plan, places?.recordId ?? null, {
			found: tiktok?.found ?? 0,
			saved: tiktok?.saved ?? 0,
		});
	}

	@DurableWorkflow({ name: workflowName('scrape-venue-social', 'week') })
	@EnsureRequestContext()
	async week(cityId: string, _week: string) {
		const now = await durableNow(this.durable);
		const plan = await this.planWeek(cityId, now);
		const tiktok =
			plan.tiktok ? await this.tiktokSearch.call({ ...plan.tiktok, cityId }) : null;
		return { brands: plan.brands, found: tiktok?.found ?? 0, saved: tiktok?.saved ?? 0 };
	}

	/** The month's report brands by name: half the budget to TikTok over the last three months (the search actor's $4 floor, hence the step's $8 default), half to their Instagram place pages */
	@DurableStep({ name: 'plan month' })
	private async planMonth(cityId: string, month: string): Promise<VenueSocialMonthPlan> {
		const city = await this.cityService.getById(cityId);
		const brands = await this.reportBrands.of(city, month);
		const venues = brands.map(b => b.branches[0]);
		const since = `${month}-01T00:00:00.000Z`;
		const half = stepBudgetUsd(city, PipelineStepEnum.SCRAPE_VENUE_SOCIAL) / 2;
		return {
			brands: brands.length,
			since,
			tiktok: this.socialScrapeService.planVenueSearch(city, venues, {
				since,
				perSource: 30,
				budgetUsd: half,
				window: 'THREE_MONTH',
			}),
			instagram: this.socialScrapeService.planVenuePlaces(city, venues, {
				since,
				perSource: 30,
				budgetUsd: half,
			}),
		};
	}

	/** The last finished month's report brands, their competitors and the open prospects by name over the week, TikTok only */
	@DurableStep({ name: 'plan week' })
	private async planWeek(cityId: string, now: Date): Promise<VenueSocialWeekPlan> {
		const city = await this.cityService.getById(cityId);
		const venues = await this.reportBrands.nameSearchVenues(city, previousMonth());
		return {
			brands: venues.length,
			tiktok: this.socialScrapeService.planVenueSearch(city, venues, {
				since: new Date(now.getTime() - WEEK_DAYS * DAY_MS).toISOString(),
				perSource: 30,
				budgetUsd: stepBudgetUsd(city, PipelineStepEnum.SCRAPE_VENUE_SOCIAL_RECENT),
				window: 'WEEK',
			}),
		};
	}

	/** The place pages' posts saved from the run's items, and the month's summary */
	@DurableStep({ name: PipelineStepEnum.SCRAPE_VENUE_SOCIAL })
	private async savePlaces(
		cityId: string,
		plan: VenueSocialMonthPlan,
		recordId: string | null,
		tiktok: { found: number; saved: number },
	) {
		const city = await this.cityService.getById(cityId);
		const instagram = await this.socialScrapeService.saveVenuePlaces(
			city,
			plan.instagram,
			recordId,
			plan.since,
		);
		return {
			brands: plan.brands,
			tiktok,
			instagram,
			found: tiktok.found + instagram.found,
			saved: tiktok.saved + instagram.saved,
		};
	}
}
