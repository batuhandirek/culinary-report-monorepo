import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { stepBudgetUsd } from 'src/modules/cities/util/city.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow } from 'src/modules/durable-workflows/util/durable-steps.js';
import {
	type AccountTwinPlan,
	type AccountTwinRecords,
	type AccountTwinResult,
	AccountTwinService,
} from 'src/modules/social/services/account-twin.service.js';

import { InstagramProfilesWorkflow } from '../../atoms/instagram-profiles/workflows/instagram-profiles.workflow.js';
import { TiktokProfilesWorkflow } from '../../atoms/tiktok-profiles/workflows/tiktok-profiles.workflow.js';
import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import { LOOKUP_VENUES_WEEK } from '../../lookup-venues/constants/lookup-venues.constant.js';
import { LookupVenuesWeekWorkflow } from '../../lookup-venues/workflows/lookup-venues-week.workflow.js';
import { runOperation, workflowName } from '../../shared/util/operations.js';

/**
 * The brands still missing a platform get their handle looked up there ($1): what the brands'
 * sites and the posts' tags give is linked free by every matching run, so it goes after the week's
 * lookups and matching, which it calls. The lookups are the profile atoms' children
 * (`instagram-profiles.run`, then `tiktok-profiles.run`) saving only the accounts we know (a
 * stranger with the same handle gets none); the proofs are read from the runs' stored items in
 * the save step.
 */
@Injectable()
export class FindOwnAccountsWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly accountTwinService: AccountTwinService,
		private readonly lookupVenues: LookupVenuesWeekWorkflow,
		private readonly instagramProfiles: InstagramProfilesWorkflow,
		private readonly tiktokProfiles: TiktokProfilesWorkflow,
	) {}

	@DurableWorkflow({ name: workflowName('find-own-accounts', 'week') })
	@EnsureRequestContext()
	async week(cityId: string, week: string): Promise<AccountTwinResult> {
		await runOperation(this.durable, this.lookupVenues.week, LOOKUP_VENUES_WEEK, cityId, week);
		const now = await durableNow(this.durable);
		const plan = await this.plan(cityId);
		const context = { cityId, now: now.toISOString(), save: { accounts: 'known' as const } };
		const instagram =
			plan.instagram ?
				await this.instagramProfiles.call({ ...plan.instagram, ...context })
			:	null;
		const tiktok =
			plan.tiktok ? await this.tiktokProfiles.call({ ...plan.tiktok, ...context }) : null;
		return this.linkTwins(
			cityId,
			plan,
			{
				...(instagram && { instagram: instagram.recordId }),
				...(tiktok && { tiktok: tiktok.recordId }),
			},
			now,
		);
	}

	/** An own account's handle on the other platform, highest lead score first, as the budget covers */
	@DurableStep({ name: 'plan' })
	private async plan(cityId: string): Promise<AccountTwinPlan> {
		const city = await this.cityService.getById(cityId);
		return this.accountTwinService.planLookup(
			city,
			stepBudgetUsd(city, PipelineStepEnum.FIND_OWN_ACCOUNTS),
		);
	}

	/** The profiles judged from the runs' stored items: linked when proven, suggested when named after the brand */
	@DurableStep({ name: 'link twins' })
	private async linkTwins(
		cityId: string,
		plan: AccountTwinPlan,
		records: AccountTwinRecords,
		now: Date,
	): Promise<AccountTwinResult> {
		return this.accountTwinService.saveLookup(
			await this.cityService.getById(cityId),
			plan,
			records,
			now,
		);
	}
}
