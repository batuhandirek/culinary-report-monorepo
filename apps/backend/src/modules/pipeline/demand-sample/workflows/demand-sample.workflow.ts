import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import type { WorkflowHandle } from '@dbos-inc/dbos-sdk';

import _ from 'lodash';

import { runActorCallRef, startActorCall } from 'src/modules/apify/actors/actor.js';
import { type ActorRunRef, ApifyService } from 'src/modules/apify/services/apify.service.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { stepBudgetUsd } from 'src/modules/cities/util/city.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow, settleHandles } from 'src/modules/durable-workflows/util/durable-steps.js';
import { VenueScrapeSourceEnum } from 'src/modules/venues/constants/venue-status.constant.js';
import { VenueBusynessService } from 'src/modules/venues/services/venue-busyness.service.js';
import {
	type ReservationPlan,
	type ReservationRecords,
	type ReservationSampleResult,
	VenueReservationService,
} from 'src/modules/venues/services/venue-reservation.service.js';
import { previousMonth } from 'src/modules/venues/util/month.js';

import { type PlacesResult, PlacesWorkflow } from '../../atoms/places/workflows/places.workflow.js';
import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import { ReportBrandsService } from '../../shared/services/report-brands.service.js';
import { workflowName } from '../../shared/util/operations.js';
import { RESERVATION_SAMPLE_MAX_VENUES } from '../constants/demand-sample.constant.js';

/** What the busyness plan step says: the venues to sample (every report branch and competitor) */
interface BusynessPlan {
	venues: { id: string; placeId: string }[];
	competitors: number;
	budgetUsd: number;
}

/**
 * A city's evening demand, sampled now (the period is the city's local day): Google's popular
 * times of every open branch of the last report month's brands and their competitors (one
 * `places.run` of their detail pages, the sample read from its items), and the booked-out share
 * of every open venue with a booking page, subscribers first, up to the cap: Google's own booking
 * pages fetched in a step (free), TheFork's one run and OpenTable's run per domain and date as
 * children on the `apify` queue (started first, the Google fetch meanwhile, then awaited), the
 * samples saved in one step; a platform that failed fails the run once the others are saved.
 */
@Injectable()
export class DemandSampleWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly apifyService: ApifyService,
		private readonly cityService: CityService,
		private readonly reportBrands: ReportBrandsService,
		private readonly venueBusynessService: VenueBusynessService,
		private readonly venueReservationService: VenueReservationService,
		private readonly places: PlacesWorkflow,
	) {}

	@DurableWorkflow({ name: workflowName('sample-busyness', 'day') })
	@EnsureRequestContext()
	async busyness(cityId: string, _day: string) {
		const now = await durableNow(this.durable);
		const plan = await this.planBusyness(cityId, now);
		const details =
			plan.venues.length ?
				await this.places.call({
					cityId: null,
					search: { mode: 'details', placeIds: plan.venues.map(v => v.placeId) },
					maxCostUsd: plan.budgetUsd,
					purpose: `google-places busyness: ${plan.venues.length} venues`,
					save: { source: VenueScrapeSourceEnum.DETAILS, newPlaces: 'none' },
				})
			:	null;
		return this.saveBusyness(plan, details, now);
	}

	@DurableWorkflow({ name: workflowName('sample-reservations', 'day') })
	@EnsureRequestContext()
	async reservations(cityId: string, _day: string): Promise<ReservationSampleResult> {
		const now = await durableNow(this.durable);
		const plan = await this.planReservations(cityId, now);
		// The paid platforms' runs first, so they run while Google's pages are fetched
		const thefork =
			plan.thefork ? await startActorCall(this.apifyService, plan.thefork.call) : null;
		const opentable: WorkflowHandle<ActorRunRef>[] = [];
		for (const run of plan.opentable)
			opentable.push(await startActorCall(this.apifyService, run.call));
		const google = await this.sampleGoogle(plan, now);
		const settledFork = thefork ? await settleHandles([thefork]) : [];
		const settledTable = await settleHandles(opentable);
		const failed: string[] = [
			...(google.error ? [`google: ${google.error}`] : []),
			...settledFork.flatMap(o => (o.ok ? [] : [`thefork: ${o.error}`])),
			...settledTable.flatMap((o, i) =>
				o.ok ? [] : [`${plan.opentable[i].call.purpose}: ${o.error}`],
			),
		];
		const byPlatform = await this.saveReservations(
			plan,
			{
				...(thefork && {
					thefork: settledFork[0].ok ? settledFork[0].value.recordId : null,
				}),
				opentable: settledTable.map(o => (o.ok ? o.value.recordId : null)),
			},
			now,
		);
		if (failed.length) throw new Error(`Reservation sampling failed (${failed.join('; ')})`);
		const samples = { ...(plan.google.length && { google: google.found }), ...byPlatform };
		return {
			venues: plan.venues,
			noPlatform: plan.noPlatform,
			capped: plan.capped,
			samples: Object.values(samples).reduce((n, v) => n + v, 0),
			byPlatform: samples,
		};
	}

	/** The last report month's branches and competitors, with their place ids */
	@DurableStep({ name: 'plan busyness' })
	private async planBusyness(cityId: string, now: Date): Promise<BusynessPlan> {
		const city = await this.cityService.getById(cityId);
		const scope = await this.reportBrands.scope(city, previousMonth(now));
		return {
			venues: _.uniqBy(
				[...scope.branches, ...scope.competitors].map(v => ({
					id: v.id,
					placeId: v.placeId,
				})),
				v => v.id,
			),
			competitors: scope.competitors.length,
			budgetUsd: stepBudgetUsd(city, PipelineStepEnum.SAMPLE_BUSYNESS),
		};
	}

	/** One sample per venue the run returned, read from its items */
	@DurableStep({ name: PipelineStepEnum.SAMPLE_BUSYNESS })
	private async saveBusyness(plan: BusynessPlan, details: PlacesResult | null, now: Date) {
		const sample =
			details ?
				await this.venueBusynessService.saveSample(plan.venues, details.recordId, now)
			:	{ requested: 0, sampled: 0, withPopularTimes: 0, withLive: 0 };
		return { ...sample, competitors: plan.competitors };
	}

	/** Every open venue with a booking page in the sampling order, up to the cap, and the paid platforms' runs */
	@DurableStep({ name: 'plan reservations' })
	private async planReservations(cityId: string, now: Date): Promise<ReservationPlan> {
		const city = await this.cityService.getById(cityId);
		const scope = await this.reportBrands.scope(city, previousMonth(now));
		const venues = await this.venueReservationService.sampleOrder(city.id, {
			won: scope.brands.filter(b => b.won).map(b => b.brand.id),
			report: scope.brands.map(b => b.brand.id),
			competitorVenueIds: scope.competitors.map(v => v.id),
		});
		return this.venueReservationService.planSample(
			venues,
			city,
			stepBudgetUsd(city, PipelineStepEnum.SAMPLE_RESERVATIONS),
			{ now, maxVenues: RESERVATION_SAMPLE_MAX_VENUES },
		);
	}

	/** Google's own booking pages, fetched and saved (free); a captcha keeps the samples taken and is reported */
	@DurableStep({ name: 'google reserve' })
	private async sampleGoogle(plan: ReservationPlan, now: Date) {
		return this.venueReservationService.sampleGoogle(plan.google, plan.dates, now);
	}

	/** The paid platforms' samples from their runs' items */
	@DurableStep({ name: PipelineStepEnum.SAMPLE_RESERVATIONS })
	private async saveReservations(plan: ReservationPlan, records: ReservationRecords, now: Date) {
		return this.venueReservationService.saveSamples(plan, records, now);
	}
}
