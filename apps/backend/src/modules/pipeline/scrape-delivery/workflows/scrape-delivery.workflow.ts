import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import type { WorkflowHandle } from '@dbos-inc/dbos-sdk';

import { runActorCallRef, startActorCall } from 'src/modules/apify/actors/actor.js';
import { type ActorRunRef, ApifyService } from 'src/modules/apify/services/apify.service.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { stepBudgetUsd } from 'src/modules/cities/util/city.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow, settleHandles } from 'src/modules/durable-workflows/util/durable-steps.js';
import { DELIVERY_BRAND_BUDGET_USD } from 'src/modules/venues/constants/delivery.constant.js';
import { BrandService } from 'src/modules/venues/services/brand.service.js';
import {
	type DeliveryFetchPlan,
	type DeliveryRunRecords,
	type DeliveryScrapeResult,
	type DeliverySearchPlan,
	VenueDeliveryService,
} from 'src/modules/venues/services/venue-delivery.service.js';

import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import { ReportBrandsService } from '../../shared/services/report-brands.service.js';
import { workflowName } from '../../shared/util/operations.js';
import { SCRAPE_DELIVERY_BRAND } from '../constants/scrape-delivery.constant.js';

/** What the first plan step stores: the venues the run is for, what it may spend, and the search */
interface DeliveryScope {
	venueIds: string[];
	budgetUsd: number;
	search: DeliverySearchPlan;
}

export interface ScrapeDeliveryResult extends DeliveryScrapeResult {
	venues: number;
	/** Brands searched for, and venues due a search the budget left for the next run */
	brandsSearched: number;
	searchLeft: number;
	/** Pages a search found that the budget left unread */
	pagesLeft: number;
}

/**
 * The venues' pages on Wolt, Lieferando and Uber Eats: their ratings, fees and delivery times as
 * the month's snapshot, and their menus, kept item by item (`VenueDeliveryService`). One web
 * search finds the pages of the venues not on every platform yet (a child on the `apify` queue),
 * then every page, held or found, is read by its address: Uber Eats' and Lieferando's in one run
 * each, Wolt's a run a page, every run a child started first and awaited in order. A Wolt page
 * whose run failed is counted and read again next time; a failed batch fails the run once the rest
 * is saved, and an admin resumes it.
 *
 * `month` covers every report branch and their competitors (each branch's price block compares its
 * menu with theirs), the held listings first, then as many new searches as the step's budget
 * covers. `brand` is one brand in a city by hand ("Find menus", `AdminScrapeDeliveryController`):
 * every open branch searched again whatever its last search, filed under the month it runs in.
 */
@Injectable()
export class ScrapeDeliveryWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly apifyService: ApifyService,
		private readonly cityService: CityService,
		private readonly brandService: BrandService,
		private readonly reportBrands: ReportBrandsService,
		private readonly venueDeliveryService: VenueDeliveryService,
	) {}

	@DurableWorkflow({ name: workflowName('scrape-delivery', 'month') })
	@EnsureRequestContext()
	async month(cityId: string, month: string): Promise<ScrapeDeliveryResult> {
		const now = await durableNow(this.durable);
		return this.run(cityId, await this.planMonth(cityId, month, now), month, now);
	}

	@DurableWorkflow({ name: SCRAPE_DELIVERY_BRAND })
	@EnsureRequestContext()
	async brand(brandId: string, cityId: string): Promise<ScrapeDeliveryResult> {
		const now = await durableNow(this.durable);
		return this.run(
			cityId,
			await this.planBrand(brandId, cityId, now),
			now.toISOString().slice(0, 7),
			now,
		);
	}

	private async run(
		cityId: string,
		scope: DeliveryScope,
		month: string,
		now: Date,
	): Promise<ScrapeDeliveryResult> {
		const searched =
			scope.search.call ? await runActorCallRef(this.apifyService, scope.search.call) : null;
		const plan = await this.planPages(cityId, scope, searched?.recordId ?? null);
		// Every read started first, then awaited in the order started: Uber Eats, Lieferando, Wolt's
		const batches = [plan.uberEats, plan.lieferando];
		const handles: WorkflowHandle<ActorRunRef>[] = [];
		for (const call of [...batches, ...plan.wolt])
			if (call) handles.push(await startActorCall(this.apifyService, call));
		const settled = await settleHandles(handles);
		const outcomes = [...settled];
		const record = (planned: boolean) => {
			const outcome = planned ? outcomes.shift() : undefined;
			return outcome?.ok ? outcome.value.recordId : null;
		};
		const records: DeliveryRunRecords = {
			uberEats: record(!!plan.uberEats),
			lieferando: record(!!plan.lieferando),
			wolt: plan.wolt.map(() => record(true)),
		};
		const saved = await this.save(plan, records, month, now);
		const failedBatch = settled
			.slice(0, batches.filter(Boolean).length)
			.find((outcome): outcome is { ok: false; error: string } => !outcome.ok);
		if (failedBatch) throw new Error(`A delivery read failed: ${failedBatch.error}`);
		return {
			...saved,
			venues: scope.venueIds.length,
			brandsSearched: scope.search.brands.length,
			searchLeft: scope.search.left,
			pagesLeft: plan.left,
		};
	}

	/** The month's scope (the report branches, then their competitors) and the search of those due one */
	@DurableStep({ name: 'plan month' })
	private async planMonth(cityId: string, month: string, now: Date): Promise<DeliveryScope> {
		const city = await this.cityService.getById(cityId);
		const scope = await this.reportBrands.scope(city, month);
		const venueIds = [...scope.branches, ...scope.competitors].map(v => v.id);
		const budgetUsd = stepBudgetUsd(city, PipelineStepEnum.SCRAPE_DELIVERY);
		return {
			venueIds,
			budgetUsd,
			search: await this.venueDeliveryService.planSearch(city, venueIds, { budgetUsd, now }),
		};
	}

	/** One brand's open branches in the city, each searched again */
	@DurableStep({ name: 'plan brand' })
	private async planBrand(brandId: string, cityId: string, now: Date): Promise<DeliveryScope> {
		const city = await this.cityService.getById(cityId);
		const venueIds = (await this.brandService.branchesIn(brandId, cityId)).map(v => v.id);
		return {
			venueIds,
			budgetUsd: DELIVERY_BRAND_BUDGET_USD,
			search: await this.venueDeliveryService.planSearch(city, venueIds, {
				budgetUsd: DELIVERY_BRAND_BUDGET_USD,
				now,
				force: true,
			}),
		};
	}

	/** The pages to read: the held listings, Google's order links, what the search found */
	@DurableStep({ name: 'plan pages' })
	private async planPages(
		cityId: string,
		scope: DeliveryScope,
		searchRecordId: string | null,
	): Promise<DeliveryFetchPlan> {
		return this.venueDeliveryService.planFetch(
			await this.cityService.getById(cityId),
			scope.venueIds,
			scope.search,
			searchRecordId,
			scope.budgetUsd,
		);
	}

	/** Each page that came back stored as its venue's listing, snapshot and menu */
	@DurableStep({ name: PipelineStepEnum.SCRAPE_DELIVERY })
	private async save(
		plan: DeliveryFetchPlan,
		records: DeliveryRunRecords,
		month: string,
		now: Date,
	): Promise<DeliveryScrapeResult> {
		return this.venueDeliveryService.saveFetched(plan, records, month, now);
	}
}
