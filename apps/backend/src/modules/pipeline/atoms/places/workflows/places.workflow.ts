import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import type { WorkflowHandle } from '@dbos-inc/dbos-sdk';

import { runActorCallRef } from 'src/modules/apify/actors/actor.js';
import {
	GOOGLE_PLACES_ACTOR,
	type GooglePlaceItem,
	type GooglePlacesInput,
} from 'src/modules/apify/actors/google-places.actor.js';
import { type ActorRunRef, ApifyService } from 'src/modules/apify/services/apify.service.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import type { VenueScrapeSourceEnum } from 'src/modules/venues/constants/venue-status.constant.js';
import {
	type NewPlacesRule,
	VenueScrapeService,
} from 'src/modules/venues/services/venue-scrape.service.js';

import {
	MAP_SEARCH_MEMORY_MB,
	PLACES_MIN_CAP_USD,
	PLACES_WORKFLOW,
} from '../constants/places.constant.js';
import {
	needsCity,
	placesInput,
	type PlacesSearch,
	queriesOf,
	queryOf,
} from '../util/places-input.js';
import { orderedPlaces } from '../util/places-search.js';

/** One Google Maps run, as a caller asks for it (plain JSON: the workflow's stored argument) */
export interface PlacesRun {
	/** The city a new place joins and a grid or map search is placed in; null for the detail pages of known places */
	cityId: string | null;
	search: PlacesSearch;
	/** The run's cap, floored at the actor's lowest (`PLACES_MIN_CAP_USD`) */
	maxCostUsd: number;
	/** The `ApifyRun`'s purpose: "google-places lookups Berlin: 412" */
	purpose: string;
	/** How the places are saved (`VenueScrapeService.savePlaces`) */
	save: { source: VenueScrapeSourceEnum; newPlaces: NewPlacesRule; openings?: boolean };
	/** Filled by `start`: the workflow that asked (the operation), the run's owner on its `ApifyRun` row */
	owner?: string;
}

/** What a caller reads back: never the items (they stay on the `ApifyRun` row), only what it needs */
export interface PlacesResult {
	/** `ApifyRun.id`: `ApifyService.storedItems(recordId)` reads the items again */
	recordId: string;
	found: number;
	saved: number;
	/** Per query asked, the place ids in Google's order (a map search's one query, else the string the actor echoes); empty when nothing came back */
	byQuery: Record<string, string[]>;
	/** Place id → our venue id, for the places kept */
	venueIds: Record<string, string>;
}

/**
 * The `places` atom: every Google Maps call in the app, one workflow (`places.run`). A caller
 * describes the search (`PlacesSearch`: a grid, typed or map search, or detail pages) and how the
 * places are saved; the atom builds the actor's input in a step of its own, runs the actor as a
 * child on the `apify` queue (the credit wait, four at a time, one run shared by callers asking
 * for the same input) and saves what came back through the one save path
 * (`VenueScrapeService.savePlaces`) in a step. Its result is ids and counts, never bulk: a caller
 * that needs more of an item (a place's rating at its rank, a live busyness percent) reads the
 * stored items by `recordId` in its own save step.
 *
 * Started from an operation's body with `start` (a handle, for a fan-out) or `call` (the result),
 * never from inside a step. A child started from a body gets DBOS's deterministic child id, so a
 * resumed parent re-attaches to it.
 */
@Injectable()
export class PlacesWorkflow {
	private readonly logger = new Logger(PlacesWorkflow.name);

	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly apifyService: ApifyService,
		private readonly cityService: CityService,
		private readonly venueScrapeService: VenueScrapeService,
	) {}

	@DurableWorkflow({ name: PLACES_WORKFLOW })
	@EnsureRequestContext()
	async run(run: PlacesRun): Promise<PlacesResult> {
		const input = await this.input(run);
		const ref = await runActorCallRef(
			this.apifyService,
			{
				actor: GOOGLE_PLACES_ACTOR,
				input,
				maxCostUsd: Math.max(PLACES_MIN_CAP_USD, run.maxCostUsd),
				purpose: run.purpose,
			},
			{
				...(run.search.mode === 'map' && { memoryMbytes: MAP_SEARCH_MEMORY_MB }),
				...(run.owner && { ownerWorkflowId: run.owner }),
			},
		);
		return this.save(run, ref);
	}

	/**
	 * Starts a run from an operation's body as its child, tagged for `/admin/workflows` (the city,
	 * the purpose), the operation as the run's owner. The handle, for a fan-out (`settleHandles`).
	 */
	async start(run: PlacesRun): Promise<WorkflowHandle<PlacesResult>> {
		const owner = this.durable.workflowId();
		return this.durable.start(this.run, [{ ...run, ...(owner && { owner }) }], {
			attributes: { ...(run.cityId && { cityId: run.cityId }), purpose: run.purpose },
		});
	}

	/** `start` and its result: the one call most operations make */
	async call(run: PlacesRun): Promise<PlacesResult> {
		return (await this.start(run)).getResult();
	}

	/** The actor's input, from the search and (a grid or map search) the city's row */
	@DurableStep({ name: 'input' })
	private async input(run: PlacesRun): Promise<GooglePlacesInput> {
		if (needsCity(run.search) && !run.cityId)
			throw new Error(`A ${run.search.mode} search needs a city`);
		const city = needsCity(run.search) ? await this.cityService.getById(run.cityId!) : null;
		return placesInput(run.search, city);
	}

	/** The run's items read from its row and saved; the result's ids per query and venue ids */
	@DurableStep({ name: 'save places' })
	private async save(run: PlacesRun, ref: ActorRunRef): Promise<PlacesResult> {
		const items = await this.apifyService.storedItems<GooglePlaceItem>(ref.recordId);
		const city = run.cityId ? await this.cityService.getById(run.cityId) : undefined;
		const { saved, venueIds } = await this.venueScrapeService.savePlaces(items, {
			city,
			...run.save,
		});
		const byQuery: Record<string, string[]> = Object.fromEntries(
			queriesOf(run.search).map(query => [query, [] as string[]]),
		);
		const grouped = new Map<string, GooglePlaceItem[]>();
		for (const item of items) {
			const query = queryOf(run.search, item);
			if (query === null) continue;
			grouped.set(query, [...(grouped.get(query) ?? []), item]);
		}
		for (const [query, list] of grouped)
			byQuery[query] = orderedPlaces(list).map(item => item.placeId!);
		this.logger.log(`${run.purpose}: ${items.length} places, ${saved} saved`);
		return { recordId: ref.recordId, found: items.length, saved, byQuery, venueIds };
	}
}
