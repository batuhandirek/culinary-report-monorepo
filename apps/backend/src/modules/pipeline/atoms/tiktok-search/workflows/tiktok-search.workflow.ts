import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import type { WorkflowHandle } from '@dbos-inc/dbos-sdk';

import { runActorCallRef } from 'src/modules/apify/actors/actor.js';
import {
	TIKTOK_SEARCH_ACTOR,
	type TiktokSearchInput,
	type TiktokSearchItem,
} from 'src/modules/apify/actors/tiktok-search.actor.js';
import { type ActorRunRef, ApifyService } from 'src/modules/apify/services/apify.service.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { SocialScrapeService } from 'src/modules/social/services/social-scrape.service.js';

import {
	TIKTOK_SEARCH_MIN_CAP,
	TIKTOK_SEARCH_WORKFLOW,
} from '../constants/tiktok-search.constant.js';
import { type TiktokSearchCall, tiktokSearchInput } from '../util/tiktok-search-input.js';

/** One search run, as a caller asks for it (plain JSON: the workflow's stored argument) */
export interface TiktokSearchRun extends TiktokSearchCall {
	/** The city whose region is searched and whose posts the videos become */
	cityId: string;
	/** Filled by `start`: the workflow that asked (the operation), the run's owner on its `ApifyRun` row */
	owner?: string;
}

/** What a caller reads back: never the items (they stay on the `ApifyRun` row), only what it needs */
export interface TiktokSearchResult {
	/** `ApifyRun.id`: `ApifyService.storedItems(recordId)` reads the items again */
	recordId: string;
	/** Items the run returned, every query's together */
	found: number;
	/** Posts written (a video two queries found once, with both finds; those before `since` left out) */
	saved: number;
}

/**
 * The `tiktok-search` atom: every TikTok search run in the app, one workflow (`tiktok-search.run`).
 * A caller gives the queries, the window, the results per query, the day the kept videos start
 * and how the finds are recorded (`TiktokSearchFinds`: a city search's kinds, a venue search's
 * venues); the atom builds the actor's input in a step of its own (the city's region), runs the
 * actor as a child on the `apify` queue (the credit wait, four at a time, one run shared by callers
 * asking for the same input; every cap floored at the actor's $4) and saves what came back through
 * the one save path (`SocialScrapeService.saveTikTokSearch`: the videos as posts with their finds,
 * subtitles downloaded while mapping) in a step. Its result is counts, never items.
 *
 * Started from an operation's body with `start` (a handle) or `call` (the result), never from
 * inside a step. A child started from a body gets DBOS's deterministic child id, so a resumed
 * parent re-attaches to it.
 */
@Injectable()
export class TiktokSearchWorkflow {
	private readonly logger = new Logger(TiktokSearchWorkflow.name);

	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly apifyService: ApifyService,
		private readonly cityService: CityService,
		private readonly socialScrapeService: SocialScrapeService,
	) {}

	@DurableWorkflow({ name: TIKTOK_SEARCH_WORKFLOW })
	@EnsureRequestContext()
	async run(run: TiktokSearchRun): Promise<TiktokSearchResult> {
		const input = await this.input(run);
		const ref = await runActorCallRef(
			this.apifyService,
			{
				actor: TIKTOK_SEARCH_ACTOR,
				input,
				maxCostUsd: Math.max(TIKTOK_SEARCH_MIN_CAP, run.maxCostUsd),
				purpose: run.purpose,
			},
			run.owner ? { ownerWorkflowId: run.owner } : {},
		);
		return this.save(run, ref);
	}

	/** Starts a run from an operation's body as its child, tagged for `/admin/workflows`, the operation as the run's owner */
	async start(run: TiktokSearchRun): Promise<WorkflowHandle<TiktokSearchResult>> {
		const owner = this.durable.workflowId();
		return this.durable.start(this.run, [{ ...run, ...(owner && { owner }) }], {
			attributes: { cityId: run.cityId, purpose: run.purpose },
		});
	}

	/** `start` and its result: the one call the operations make */
	async call(run: TiktokSearchRun): Promise<TiktokSearchResult> {
		return (await this.start(run)).getResult();
	}

	/** The actor's input: the queries in the city's region */
	@DurableStep({ name: 'input' })
	private async input(run: TiktokSearchRun): Promise<TiktokSearchInput> {
		const city = await this.cityService.getById(run.cityId);
		return tiktokSearchInput(run, city.tiktokRegion);
	}

	/** The run's items read from its row and saved as the city's posts; the counts */
	@DurableStep({ name: 'save posts' })
	private async save(run: TiktokSearchRun, ref: ActorRunRef): Promise<TiktokSearchResult> {
		const items = await this.apifyService.storedItems<TiktokSearchItem>(ref.recordId);
		const city = await this.cityService.getById(run.cityId);
		const saved = await this.socialScrapeService.saveTikTokSearch(city, items, run);
		this.logger.log(`${run.purpose}: ${items.length} videos, ${saved} posts saved`);
		return { recordId: ref.recordId, found: items.length, saved };
	}
}
