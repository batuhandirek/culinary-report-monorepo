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
	type ProfileTrackPlan,
} from 'src/modules/social/services/account-scrape.service.js';
import { profilesTotal } from 'src/modules/social/util/profile-runs.js';

import { InstagramProfilesWorkflow } from '../../atoms/instagram-profiles/workflows/instagram-profiles.workflow.js';
import { TiktokProfilesWorkflow } from '../../atoms/tiktok-profiles/workflows/tiktok-profiles.workflow.js';
import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import { workflowName } from '../../shared/util/operations.js';

/**
 * Every brand account's and every big creator's follower count read again every two weeks (the
 * profile only, `AccountScrapeService.planTracked`), one profile run a platform
 * (`instagram-profiles.run`, then `tiktok-profiles.run`).
 */
@Injectable()
export class ProfileTrackWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly accountScrapeService: AccountScrapeService,
		private readonly instagramProfiles: InstagramProfilesWorkflow,
		private readonly tiktokProfiles: TiktokProfilesWorkflow,
	) {}

	@DurableWorkflow({ name: workflowName('profile-track', 'week') })
	@EnsureRequestContext()
	async week(cityId: string, _period: string) {
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
		return { due: plan.due, brandAccounts: plan.brandAccounts, asked, profiles };
	}

	/** The accounts whose last profile read is `TRACK_PROFILE_EVERY_DAYS` old, as the budget covers */
	@DurableStep({ name: 'plan' })
	private async plan(cityId: string, now: Date): Promise<ProfileTrackPlan> {
		const city = await this.cityService.getById(cityId);
		return this.accountScrapeService.planTracked(
			city,
			stepBudgetUsd(city, PipelineStepEnum.TRACK_PROFILES),
			now,
		);
	}
}
