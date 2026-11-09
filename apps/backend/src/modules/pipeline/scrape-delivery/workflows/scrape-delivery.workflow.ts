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
import {
	type DeliveryScrapeResult,
	type LieferandoPlan,
	VenueDeliveryService,
	type WoltPlan,
} from 'src/modules/venues/services/venue-delivery.service.js';

import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import { REFRESH_VENUE_DETAILS_MONTH } from '../../refresh-venue-details/constants/refresh-venue-details.constant.js';
import { RefreshVenueDetailsWorkflow } from '../../refresh-venue-details/workflows/refresh-venue-details.workflow.js';
import { ReportBrandsService } from '../../shared/services/report-brands.service.js';
import { runOperation, workflowName } from '../../shared/util/operations.js';

/** What the Wolt plan step stores: the scope's venues and the runs */
interface DeliveryWoltPlan extends WoltPlan {
	venueIds: string[];
	budgetUsd: number;
}

/**
 * Wolt and Lieferando ratings, fees and menus of every report branch and of their competitors: each
 * branch's price block compares its menu with theirs. Wolt is one run per linked restaurant (every
 * run a child on the `apify` queue, started first and awaited in order; a failed one counts as
 * failed), then Lieferando's one city-wide listing for the venues not on Wolt (a child). Google's
 * "Order online" links say where each venue delivers, so the detail pages come first: it calls that.
 */
@Injectable()
export class ScrapeDeliveryWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly apifyService: ApifyService,
		private readonly cityService: CityService,
		private readonly reportBrands: ReportBrandsService,
		private readonly venueDeliveryService: VenueDeliveryService,
		private readonly refreshVenueDetails: RefreshVenueDetailsWorkflow,
	) {}

	@DurableWorkflow({ name: workflowName('scrape-delivery', 'month') })
	@EnsureRequestContext()
	async month(cityId: string, month: string): Promise<DeliveryScrapeResult> {
		await runOperation(
			this.durable,
			this.refreshVenueDetails.month,
			REFRESH_VENUE_DETAILS_MONTH,
			cityId,
			month,
		);
		const now = await durableNow(this.durable);
		const wolt = await this.planWolt(cityId, month);
		const handles: WorkflowHandle<ActorRunRef>[] = [];
		for (const run of wolt.runs)
			handles.push(await startActorCall(this.apifyService, run.call));
		const settled = await settleHandles(handles);
		const saved = await this.saveWolt(
			wolt,
			settled.map(outcome => (outcome.ok ? outcome.value.recordId : null)),
			month,
			now,
		);
		const lieferando = await this.planLieferando(
			cityId,
			wolt.venueIds.filter(id => !saved.onWolt.includes(id)),
			wolt.budgetUsd - wolt.runs.length * wolt.perRunUsd,
		);
		const listing =
			lieferando.call ? await runActorCallRef(this.apifyService, lieferando.call) : null;
		return this.saveLieferando(lieferando, listing?.recordId ?? null, month, now, {
			venues: wolt.venueIds.length,
			wolt: {
				linked: wolt.linked,
				saved: saved.saved,
				menuItems: saved.menuItems,
				failed: saved.failed,
			},
		});
	}

	/** The scope's venues (branches and competitors) and one Wolt run per linked restaurant */
	@DurableStep({ name: 'plan wolt' })
	private async planWolt(cityId: string, month: string): Promise<DeliveryWoltPlan> {
		const city = await this.cityService.getById(cityId);
		const scope = await this.reportBrands.scope(city, month);
		const venues = [...scope.branches, ...scope.competitors];
		const budgetUsd = stepBudgetUsd(city, PipelineStepEnum.SCRAPE_DELIVERY);
		return {
			...this.venueDeliveryService.planWolt(venues, budgetUsd),
			venueIds: venues.map(v => v.id),
			budgetUsd,
		};
	}

	/** Each Wolt run's listing, snapshot and menu stored */
	@DurableStep({ name: 'save wolt' })
	private async saveWolt(plan: WoltPlan, recordIds: (string | null)[], month: string, now: Date) {
		return this.venueDeliveryService.saveWolt(plan, recordIds, month, now);
	}

	/** Lieferando's city listing for the venues not on Wolt, on what the budget has left */
	@DurableStep({ name: 'plan lieferando' })
	private async planLieferando(
		cityId: string,
		venueIds: string[],
		budgetUsd: number,
	): Promise<LieferandoPlan> {
		const city = await this.cityService.getById(cityId);
		return this.venueDeliveryService.planLieferando(venueIds, city, budgetUsd);
	}

	/** The listing matched to the venues by name and postcode, and the month's summary */
	@DurableStep({ name: PipelineStepEnum.SCRAPE_DELIVERY })
	private async saveLieferando(
		plan: LieferandoPlan,
		recordId: string | null,
		month: string,
		now: Date,
		summary: Omit<DeliveryScrapeResult, 'lieferando'>,
	): Promise<DeliveryScrapeResult> {
		return {
			...summary,
			lieferando: await this.venueDeliveryService.saveLieferando(plan, recordId, month, now),
		};
	}
}
