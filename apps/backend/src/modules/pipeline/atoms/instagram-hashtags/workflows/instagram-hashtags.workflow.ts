import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import type { WorkflowHandle } from '@dbos-inc/dbos-sdk';

import { runActorCallRef } from 'src/modules/apify/actors/actor.js';
import {
	INSTAGRAM_SCRAPER_ACTOR,
	type InstagramScraperItem,
} from 'src/modules/apify/actors/instagram-scraper.actor.js';
import { type ActorRunRef, ApifyService } from 'src/modules/apify/services/apify.service.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { callInOrder } from 'src/modules/durable-workflows/util/durable-steps.js';
import { SocialScrapeService } from 'src/modules/social/services/social-scrape.service.js';

import { INSTAGRAM_HASHTAGS_WORKFLOW } from '../constants/instagram-hashtags.constant.js';
import {
	type InstagramHashtagsCall,
	instagramHashtagsInput,
} from '../util/instagram-hashtags-input.js';

/** One hashtag run, as a caller asks for it (plain JSON: the workflow's stored argument) */
export interface InstagramHashtagsRun extends InstagramHashtagsCall {
	/** The city whose hashtags these are and whose posts the items become */
	cityId: string;
	/** Filled by `start`: the workflow that asked (the operation), the run's owner on its `ApifyRun` row */
	owner?: string;
}

/** What a caller reads back: never the items (they stay on the `ApifyRun` row), only what it needs */
export interface InstagramHashtagsResult {
	/** `ApifyRun.id`: `ApifyService.storedItems(recordId)` reads the items again */
	recordId: string;
	/** Items the run returned (an empty tag's charged error item among them) */
	found: number;
	/** Posts written (a post under two tags once, with both finds; those before `since` left out) */
	saved: number;
}

/**
 * The `instagram-hashtags` atom: every Instagram hashtag run in the app, one workflow
 * (`instagram-hashtags.run`). A caller gives the hashtags, whether it wants the tag feeds' posts
 * or their top reels, the day the kept posts start and the results per tag; the atom builds the
 * actor's input (the pure `util/instagram-hashtags-input.ts`), runs the actor as a child on the
 * `apify` queue (the credit wait, four at a time, one run shared by callers asking for the same
 * input) and saves what came back through the one save path (`SocialScrapeService.saveInstagramHashtags`:
 * the posts with their hashtag finds) in a step. Its result is counts, never items.
 *
 * Started from an operation's body with `start` (a handle), `call` (the result) or `callEach` (a
 * plan's runs one after the other), never from inside a step. A child started from a body gets
 * DBOS's deterministic child id, so a resumed parent re-attaches to it.
 */
@Injectable()
export class InstagramHashtagsWorkflow {
	private readonly logger = new Logger(InstagramHashtagsWorkflow.name);

	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly apifyService: ApifyService,
		private readonly cityService: CityService,
		private readonly socialScrapeService: SocialScrapeService,
	) {}

	@DurableWorkflow({ name: INSTAGRAM_HASHTAGS_WORKFLOW })
	@EnsureRequestContext()
	async run(run: InstagramHashtagsRun): Promise<InstagramHashtagsResult> {
		const ref = await runActorCallRef(
			this.apifyService,
			{
				actor: INSTAGRAM_SCRAPER_ACTOR,
				input: instagramHashtagsInput(run),
				maxCostUsd: run.maxCostUsd,
				purpose: run.purpose,
			},
			run.owner ? { ownerWorkflowId: run.owner } : {},
		);
		return this.save(run, ref);
	}

	/** Starts a run from an operation's body as its child, tagged for `/admin/workflows`, the operation as the run's owner */
	async start(run: InstagramHashtagsRun): Promise<WorkflowHandle<InstagramHashtagsResult>> {
		const owner = this.durable.workflowId();
		return this.durable.start(this.run, [{ ...run, ...(owner && { owner }) }], {
			attributes: { cityId: run.cityId, purpose: run.purpose },
		});
	}

	/** `start` and its result */
	async call(run: InstagramHashtagsRun): Promise<InstagramHashtagsResult> {
		return (await this.start(run)).getResult();
	}

	/**
	 * A plan's runs (the posts, then the reels) one after the other, never side by side: two saving
	 * at once could give one user two accounts. A failed run fails the call only once every other
	 * has run, so what the rest fetched is saved; the error names the failed run.
	 */
	async callEach(
		calls: InstagramHashtagsCall[],
		cityId: string,
	): Promise<InstagramHashtagsResult[]> {
		return callInOrder(calls, call => this.call({ ...call, cityId }), 'hashtag runs');
	}

	/** The run's items read from its row and saved as the city's posts; the counts */
	@DurableStep({ name: 'save posts' })
	private async save(
		run: InstagramHashtagsRun,
		ref: ActorRunRef,
	): Promise<InstagramHashtagsResult> {
		const items = await this.apifyService.storedItems<InstagramScraperItem>(ref.recordId);
		const city = await this.cityService.getById(run.cityId);
		const saved = await this.socialScrapeService.saveInstagramHashtags(city, items, run);
		this.logger.log(`${run.purpose}: ${items.length} items, ${saved} posts saved`);
		return { recordId: ref.recordId, found: items.length, saved };
	}
}
