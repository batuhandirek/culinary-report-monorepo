import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import type { WorkflowHandle } from '@dbos-inc/dbos-sdk';

import { runActorCallRef } from 'src/modules/apify/actors/actor.js';
import {
	INSTAGRAM_PROFILE_ACTOR,
	type InstagramProfileItem,
} from 'src/modules/apify/actors/instagram-profile.actor.js';
import { type ActorRunRef, ApifyService } from 'src/modules/apify/services/apify.service.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { AccountScrapeService } from 'src/modules/social/services/account-scrape.service.js';
import type { ProfileAccountsRule, ProfilesSaved } from 'src/modules/social/util/profile-runs.js';

import {
	INSTAGRAM_PROFILES_MIN_CAP_USD,
	INSTAGRAM_PROFILES_WORKFLOW,
} from '../constants/instagram-profiles.constant.js';
import {
	type InstagramProfilesCall,
	instagramProfilesInput,
} from '../util/instagram-profiles-input.js';

/** One Instagram profile run, as a caller asks for it (plain JSON: the workflow's stored argument) */
export interface InstagramProfilesRun extends InstagramProfilesCall {
	/** The city a new account joins and the posts' city */
	cityId: string;
	/** The run's time as the operation's clock has it (ISO): the stamp on every snapshot and post it writes */
	now: string;
	save: { accounts: ProfileAccountsRule };
	/** Filled by `start`: the workflow that asked (the operation), the run's owner on its `ApifyRun` row */
	owner?: string;
}

/** What a caller reads back: never the items (they stay on the `ApifyRun` row), only what it needs */
export interface InstagramProfilesResult extends ProfilesSaved {
	/** `ApifyRun.id`: `ApifyService.storedItems(recordId)` reads the items again */
	recordId: string;
	/** Items the run returned, one a profile */
	found: number;
	/** Of the profiles kept, business accounts */
	businesses: number;
}

/**
 * The `instagram-profiles` atom: every Instagram profile run in the app, one workflow
 * (`instagram-profiles.run`). A caller names the handles and what to keep
 * (`InstagramProfilesRead`: the profile alone, or its posts since a day too); the atom runs the
 * actor as a child on the `apify` queue (the credit wait, four at a time, one run shared by
 * callers asking for the same input; every cap floored at the actor's lowest) and saves what came
 * back through the one save path (`AccountScrapeService.saveInstagramProfiles`: the accounts with
 * the profiles' names, figures and what their bio says, a snapshot each, the posts since the day
 * as finds of their profile; a profile read alone stamps the accounts that came back without a
 * count) in a step. Its result is counts, never items: a caller that reads more of a profile (the
 * twin lookup's proofs) reads the stored items by `recordId` in its own save step.
 *
 * Started from an operation's body with `start` (a handle) or `call` (the result), never from
 * inside a step; an operation that runs TikTok's profiles too calls the two atoms one after the
 * other, never side by side (a new account joins its twin on the other platform as it is saved).
 */
@Injectable()
export class InstagramProfilesWorkflow {
	private readonly logger = new Logger(InstagramProfilesWorkflow.name);

	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly apifyService: ApifyService,
		private readonly cityService: CityService,
		private readonly accountScrapeService: AccountScrapeService,
	) {}

	@DurableWorkflow({ name: INSTAGRAM_PROFILES_WORKFLOW })
	@EnsureRequestContext()
	async run(run: InstagramProfilesRun): Promise<InstagramProfilesResult> {
		const ref = await runActorCallRef(
			this.apifyService,
			{
				actor: INSTAGRAM_PROFILE_ACTOR,
				input: instagramProfilesInput(run),
				maxCostUsd: Math.max(INSTAGRAM_PROFILES_MIN_CAP_USD, run.maxCostUsd),
				purpose: run.purpose,
			},
			run.owner ? { ownerWorkflowId: run.owner } : {},
		);
		return this.save(run, ref);
	}

	/** Starts a run from an operation's body as its child, tagged for `/admin/workflows`, the operation as the run's owner */
	async start(run: InstagramProfilesRun): Promise<WorkflowHandle<InstagramProfilesResult>> {
		const owner = this.durable.workflowId();
		return this.durable.start(this.run, [{ ...run, ...(owner && { owner }) }], {
			attributes: { cityId: run.cityId, purpose: run.purpose },
		});
	}

	/** `start` and its result */
	async call(run: InstagramProfilesRun): Promise<InstagramProfilesResult> {
		return (await this.start(run)).getResult();
	}

	/** The run's items read from its row and saved; the counts */
	@DurableStep({ name: 'save profiles' })
	private async save(
		run: InstagramProfilesRun,
		ref: ActorRunRef,
	): Promise<InstagramProfilesResult> {
		const items = await this.apifyService.storedItems<InstagramProfileItem>(ref.recordId);
		const city = await this.cityService.getById(run.cityId);
		const saved = await this.accountScrapeService.saveInstagramProfiles(city, run, items, {
			now: new Date(run.now),
			accounts: run.save.accounts,
		});
		this.logger.log(
			`${run.purpose}: ${saved.profiles} of ${saved.asked} profiles, ${saved.saved} posts`,
		);
		return { recordId: ref.recordId, found: items.length, ...saved };
	}
}
