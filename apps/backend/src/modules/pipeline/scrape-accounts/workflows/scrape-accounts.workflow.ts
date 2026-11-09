import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { stepBudgetUsd } from 'src/modules/cities/util/city.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow } from 'src/modules/durable-workflows/util/durable-steps.js';
import { ProspectQueryService } from 'src/modules/outreach/services/prospect-query.service.js';
import {
	AccountWatchService,
	BRAND_WATCH_KINDS,
	MONTHLY_WATCH_KINDS,
	type WatchReasonKindEnum,
} from 'src/modules/social/services/account-watch.service.js';
import { OwnAccountService } from 'src/modules/social/services/own-account.service.js';
import {
	type ProfileRuns,
	profileRuns,
	profilesTotal,
} from 'src/modules/social/util/profile-runs.js';
import { previousMonth } from 'src/modules/venues/util/month.js';

import { InstagramProfilesWorkflow } from '../../atoms/instagram-profiles/workflows/instagram-profiles.workflow.js';
import { TiktokProfilesWorkflow } from '../../atoms/tiktok-profiles/workflows/tiktok-profiles.workflow.js';
import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import { LOOKUP_VENUES_MONTH } from '../../lookup-venues/constants/lookup-venues.constant.js';
import { LookupVenuesWorkflow } from '../../lookup-venues/workflows/lookup-venues.workflow.js';
import { DAY_MS } from '../../shared/constants/cadence.constant.js';
import { ReportBrandsService } from '../../shared/services/report-brands.service.js';
import { runOperation, workflowName } from '../../shared/util/operations.js';
import { OWN_ACCOUNTS_KEEP_DAYS } from '../constants/scrape-accounts.constant.js';

/** What the plan step stores: the watch list's summary and the runs, one a platform */
interface AccountScrapePlan extends ProfileRuns {
	fromProspects?: number;
	watched: Partial<Record<WatchReasonKindEnum, number>>;
}

/**
 * The watched brand profiles (`AccountWatchService.watchList`). A month's run, once the month's
 * report brands are known: outreach's handles of the report brands made their accounts, then every
 * profile of the city's sources, the report brands and their rivals once, posts since the month
 * began and the snapshot over their latest ten that closes the month. A week's run: every brand's
 * own accounts (the last finished month's report brands and rivals first, then by lead score), their
 * posts of the last `OWN_ACCOUNTS_KEEP_DAYS`, so each own post is seen again at seven days old.
 * Each platform's run is its atom's child (`instagram-profiles.run`, then `tiktok-profiles.run`),
 * one after the other: a new account joins its twin on the other platform as it is saved.
 */
@Injectable()
export class ScrapeAccountsWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly reportBrands: ReportBrandsService,
		private readonly prospectQueryService: ProspectQueryService,
		private readonly ownAccountService: OwnAccountService,
		private readonly accountWatchService: AccountWatchService,
		private readonly lookupVenues: LookupVenuesWorkflow,
		private readonly instagramProfiles: InstagramProfilesWorkflow,
		private readonly tiktokProfiles: TiktokProfilesWorkflow,
	) {}

	@DurableWorkflow({ name: workflowName('scrape-accounts', 'month') })
	@EnsureRequestContext()
	async month(cityId: string, month: string) {
		await runOperation(
			this.durable,
			this.lookupVenues.month,
			LOOKUP_VENUES_MONTH,
			cityId,
			month,
		);
		const now = await durableNow(this.durable);
		const plan = await this.planMonth(cityId, month);
		return {
			fromProspects: plan.fromProspects,
			watched: plan.watched,
			...(await this.scrape(cityId, plan, now)),
		};
	}

	@DurableWorkflow({ name: workflowName('scrape-accounts', 'week') })
	@EnsureRequestContext()
	async week(cityId: string, _week: string) {
		const now = await durableNow(this.durable);
		const plan = await this.planWeek(cityId, now);
		return { watched: plan.watched, ...(await this.scrape(cityId, plan, now)) };
	}

	/** The plan's runs, Instagram then TikTok, each its atom's child; the counts summed */
	private async scrape(cityId: string, plan: ProfileRuns, now: Date) {
		const context = { cityId, now: now.toISOString(), save: { accounts: 'all' as const } };
		const instagram =
			plan.instagram ?
				await this.instagramProfiles.call({ ...plan.instagram, ...context })
			:	null;
		const tiktok =
			plan.tiktok ? await this.tiktokProfiles.call({ ...plan.tiktok, ...context }) : null;
		return profilesTotal([instagram, tiktok]);
	}

	/** Outreach's handles made accounts, the month's watch list, the latest ten of each profile from the month's start */
	@DurableStep({ name: 'plan month' })
	private async planMonth(cityId: string, month: string): Promise<AccountScrapePlan> {
		const city = await this.cityService.getById(cityId);
		const brands = await this.reportBrands.of(city, month);
		const fromProspects = await this.ownAccountService.addProspectHandles(
			await this.prospectQueryService.instagramHandles(brands.map(b => b.brand.id)),
		);
		const watched = await this.accountWatchService.watchList(city, brands, {
			month,
			top: city.topBrands,
		});
		return {
			fromProspects: fromProspects.created,
			watched: this.accountWatchService.summary(watched, MONTHLY_WATCH_KINDS),
			...profileRuns(this.accountWatchService.targets(watched, MONTHLY_WATCH_KINDS), {
				budgetUsd: stepBudgetUsd(city, PipelineStepEnum.SCRAPE_ACCOUNTS),
				since: `${month}-01T00:00:00.000Z`,
				latestTen: true,
				label: month,
			}),
		};
	}

	/** Every brand's own accounts, their posts of the last two weeks; a brand account posts a few videos a week, so TikTok is planned at three a profile */
	@DurableStep({ name: 'plan week' })
	private async planWeek(cityId: string, now: Date): Promise<AccountScrapePlan> {
		const city = await this.cityService.getById(cityId);
		const reportMonth = previousMonth();
		const watched = await this.accountWatchService.watchList(
			city,
			await this.reportBrands.of(city, reportMonth),
			{ month: reportMonth, top: city.topBrands },
		);
		return {
			watched: this.accountWatchService.summary(watched, BRAND_WATCH_KINDS),
			...profileRuns(this.accountWatchService.targets(watched, BRAND_WATCH_KINDS), {
				budgetUsd: stepBudgetUsd(city, PipelineStepEnum.SCRAPE_ACCOUNTS_RECENT),
				since: new Date(now.getTime() - OWN_ACCOUNTS_KEEP_DAYS * DAY_MS).toISOString(),
				label: 'own, last two weeks',
				tiktokItemsPerProfile: 3,
			}),
		};
	}
}
