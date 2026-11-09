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
	AccountScrapeService,
	type FollowerFillPlan,
} from 'src/modules/social/services/account-scrape.service.js';
import { type ProfileRuns, profilesTotal } from 'src/modules/social/util/profile-runs.js';

import { InstagramProfilesWorkflow } from '../../atoms/instagram-profiles/workflows/instagram-profiles.workflow.js';
import { TiktokProfilesWorkflow } from '../../atoms/tiktok-profiles/workflows/tiktok-profiles.workflow.js';
import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import { workflowName } from '../../shared/util/operations.js';

/**
 * No brand account stays without a follower count: the profile only of each one with none,
 * highest lead score first (`AccountScrapeService.planFollowers`), one profile run a platform
 * (`instagram-profiles.run`, then `tiktok-profiles.run`), then how many have a count now.
 */
@Injectable()
export class AccountFollowersWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly accountScrapeService: AccountScrapeService,
		private readonly instagramProfiles: InstagramProfilesWorkflow,
		private readonly tiktokProfiles: TiktokProfilesWorkflow,
	) {}

	@DurableWorkflow({ name: workflowName('account-followers', 'day') })
	@EnsureRequestContext()
	async day(cityId: string, _period: string) {
		const now = await durableNow(this.durable);
		const plan = await this.plan(cityId, now);
		const context = { cityId, now: now.toISOString(), save: { accounts: 'all' as const } };
		const instagram =
			plan.instagram ?
				await this.instagramProfiles.call({ ...plan.instagram, ...context })
			:	null;
		const tiktok =
			plan.tiktok ? await this.tiktokProfiles.call({ ...plan.tiktok, ...context }) : null;
		const { asked, profiles } = profilesTotal([instagram, tiktok]);
		return { missing: plan.missing, asked, profiles, filled: await this.filled(plan) };
	}

	/** The brand accounts with no follower count, their profile only, as the budget covers */
	@DurableStep({ name: 'plan' })
	private async plan(cityId: string, now: Date): Promise<FollowerFillPlan> {
		const city = await this.cityService.getById(cityId);
		return this.accountScrapeService.planFollowers(
			city,
			stepBudgetUsd(city, PipelineStepEnum.FILL_ACCOUNT_FOLLOWERS),
			now,
		);
	}

	/** Of the accounts asked for, how many have a count now */
	@DurableStep({ name: 'filled' })
	private async filled(runs: ProfileRuns): Promise<number> {
		return this.accountScrapeService.followersFilled(runs);
	}
}
