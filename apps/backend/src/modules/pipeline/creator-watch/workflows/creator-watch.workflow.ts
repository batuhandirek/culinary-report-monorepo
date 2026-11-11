import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow } from 'src/modules/durable-workflows/util/durable-steps.js';
import { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';
import {
	AccountWatchService,
	type WatchReasonKindEnum,
} from 'src/modules/social/services/account-watch.service.js';
import {
	profileRuns,
	profilesPurpose,
	type ProfilesSaved,
} from 'src/modules/social/util/profile-runs.js';
import { previousMonth } from 'src/modules/venues/util/month.js';

import type { InstagramProfilesCall } from '../../atoms/instagram-profiles/util/instagram-profiles-input.js';
import { InstagramProfilesWorkflow } from '../../atoms/instagram-profiles/workflows/instagram-profiles.workflow.js';
import type { TiktokProfilesCall } from '../../atoms/tiktok-profiles/util/tiktok-profiles-input.js';
import { TiktokProfilesWorkflow } from '../../atoms/tiktok-profiles/workflows/tiktok-profiles.workflow.js';
import { DAY_MS, WEEK_DAYS } from '../../shared/constants/cadence.constant.js';
import { ReportBrandsService } from '../../shared/services/report-brands.service.js';
import { workflowName } from '../../shared/util/operations.js';
import {
	CREATOR_SCRAPE_NOW_DAYS,
	CREATOR_SCRAPE_NOW_USD,
	CREATOR_TIKTOK_MAX_DAYS,
	CREATOR_WATCH_BUDGET_USD,
} from '../constants/creator-watch.constant.js';

/** What one city's run did: the workflow's result */
export interface CreatorWatchResult {
	/** How many watched accounts each reason brought in */
	watched: Partial<Record<WatchReasonKindEnum, number>>;
	tiktok: { since: string } & ProfilesSaved;
	instagram: { due: number } & ProfilesSaved;
}

/** What the plan step stores: the watch list's summary and the two runs */
interface CreatorWatchPlan {
	watched: Partial<Record<WatchReasonKindEnum, number>>;
	/** Where TikTok's videos start (ISO) */
	tiktokSince: string;
	/** Instagram profiles due, of which the run takes what the budget covers */
	instagramDue: number;
	tiktok: TiktokProfilesCall | null;
	instagram: InstagramProfilesCall | null;
}

/** What one creator's scrape by hand did; `cityId` absent when they have no profile to scrape */
export interface CreatorScrapeResult {
	cityId?: string;
	tiktok: ProfilesSaved;
	instagram: ProfilesSaved;
}

/** What the creator's plan step stores: the city and the two runs */
interface CreatorScrapePlan {
	cityId: string;
	tiktok: TiktokProfilesCall | null;
	instagram: InstagramProfilesCall | null;
}

const EMPTY: ProfilesSaved = { asked: 0, profiles: 0, snapshots: 0, posts: 0, saved: 0 };

/**
 * The watched creators of one city, as a workflow (daily, `CreatorWatchSchedule`): the city's
 * creator sources and the self-kept creator list (`CREATOR_WATCH_KINDS`). TikTok profiles every
 * day, paying only for the videos since the city's last finished run (`CREATOR_TIKTOK_MAX_DAYS`
 * at most); an Instagram profile (its twelve latest posts, paid per profile) once its last profile
 * read is `CREATOR_INSTAGRAM_EVERY_DAYS` old, its posts of the last week kept. Instagram's due
 * profiles are planned first, TikTok gets the rest of the budget as its cap. The reading reads the
 * posts on its own.
 *
 * `plan` is a `@DurableStep`; each platform's run is its atom's child (`tiktok-profiles.run`, then
 * `instagram-profiles.run`: its actor run a child of its own on the `apify` queue, so it waits for
 * credit like any run; its save a step), so a restart never pays or saves a finished platform twice.
 */
@Injectable()
export class CreatorWatchWorkflow {
	private readonly logger = new Logger(CreatorWatchWorkflow.name);

	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly accountWatchService: AccountWatchService,
		private readonly reportBrands: ReportBrandsService,
		private readonly instagramProfiles: InstagramProfilesWorkflow,
		private readonly tiktokProfiles: TiktokProfilesWorkflow,
	) {}

	@DurableWorkflow({ name: workflowName('creator-watch', 'day') })
	@EnsureRequestContext()
	async day(cityId: string, _day: string): Promise<CreatorWatchResult> {
		const now = await durableNow(this.durable);
		const plan = await this.plan(cityId, now);
		const context = { cityId, now: now.toISOString(), save: { accounts: 'all' as const } };
		// One platform after the other (two at once could give one person two creators: a new
		// account joins its twin on the other platform as it is saved)
		const tiktok: ProfilesSaved =
			plan.tiktok ? await this.tiktokProfiles.call({ ...plan.tiktok, ...context }) : EMPTY;
		const instagram: ProfilesSaved =
			plan.instagram ?
				await this.instagramProfiles.call({ ...plan.instagram, ...context })
			:	EMPTY;

		this.logger.log(
			`Creators of city ${cityId}: ${tiktok.profiles + instagram.profiles} profiles, ${tiktok.saved + instagram.saved} posts`,
		);
		return {
			watched: plan.watched,
			tiktok: { since: plan.tiktokSince.slice(0, 10), ...tiktok },
			instagram: { due: plan.instagramDue, ...instagram },
		};
	}

	/**
	 * One creator's profiles now, as an admin asked ("Scrape now" on the creator page, started on
	 * `CREATOR_SCRAPE_QUEUE`, one in flight per creator): TikTok's latest ten videos and Instagram's
	 * profile, the last `CREATOR_SCRAPE_NOW_DAYS` days' posts kept, `CREATOR_SCRAPE_NOW_USD` at most.
	 * The same atoms as the daily run, one platform after the other; the reading reads the posts on its own.
	 */
	@DurableWorkflow({ name: 'creator-watch.creator' })
	@EnsureRequestContext()
	async creator(creatorId: string): Promise<CreatorScrapeResult> {
		const now = await durableNow(this.durable);
		const plan = await this.planCreator(creatorId, now);
		if (!plan) return { tiktok: EMPTY, instagram: EMPTY };
		const context = { cityId: plan.cityId, now: now.toISOString(), save: { accounts: 'all' as const } };
		const tiktok: ProfilesSaved =
			plan.tiktok ? await this.tiktokProfiles.call({ ...plan.tiktok, ...context }) : EMPTY;
		const instagram: ProfilesSaved =
			plan.instagram ?
				await this.instagramProfiles.call({ ...plan.instagram, ...context })
			:	EMPTY;
		return { cityId: plan.cityId, tiktok, instagram };
	}

	/** The creator's profiles and city as runs; none without a profile */
	@DurableStep({ name: 'plan creator' })
	private async planCreator(creatorId: string, now: Date): Promise<CreatorScrapePlan | null> {
		const found = await this.accountWatchService.creatorTargets(creatorId);
		if (!found) return null;
		const runs = profileRuns(found.targets, {
			budgetUsd: CREATOR_SCRAPE_NOW_USD,
			since: new Date(now.getTime() - CREATOR_SCRAPE_NOW_DAYS * DAY_MS).toISOString(),
			latestTen: true,
			label: 'creator, by hand',
		});
		return { cityId: found.cityId, ...runs };
	}

	/** The watch list's creators, which Instagram profiles are due, and where TikTok's videos start */
	@DurableStep({ name: 'plan' })
	private async plan(cityId: string, now: Date): Promise<CreatorWatchPlan> {
		const city = await this.cityService.getById(cityId);
		const reportMonth = previousMonth();
		const plan = await this.accountWatchService.planCreatorScrape(
			city,
			await this.reportBrands.of(city, reportMonth),
			{ month: reportMonth, top: city.topBrands, now, budgetUsd: CREATOR_WATCH_BUDGET_USD },
		);
		// TikTok: from an hour before the last finished run started (TikTok's filter takes a day,
		// so only that hour's videos are paid twice), so a missed day leaves no gap
		const floor = now.getTime() - CREATOR_TIKTOK_MAX_DAYS * DAY_MS;
		const lastStart = await this.lastFinishedStart(city.id);
		const tiktokSince = new Date(
			Math.max((lastStart ?? floor) - 3_600_000, floor),
		).toISOString();
		return {
			watched: plan.watched,
			tiktokSince,
			instagramDue: plan.instagramDue,
			tiktok:
				plan.tiktok.length ?
					{
						handles: plan.tiktok,
						read: { mode: 'since', since: tiktokSince },
						maxCostUsd: plan.tiktokBudgetUsd,
						purpose: profilesPurpose(
							SocialPlatformEnum.TIKTOK,
							'creators',
							plan.tiktok.length,
						),
					}
				:	null,
			instagram:
				plan.instagram.length ?
					{
						handles: plan.instagram,
						read: {
							mode: 'posts',
							since: new Date(now.getTime() - WEEK_DAYS * DAY_MS).toISOString(),
						},
						maxCostUsd: plan.instagramBudgetUsd,
						purpose: profilesPurpose(
							SocialPlatformEnum.INSTAGRAM,
							'creators',
							plan.instagram.length,
						),
					}
				:	null,
		};
	}

	/** When the city's last successful run of this workflow started; none before its first */
	private async lastFinishedStart(cityId: string): Promise<number | undefined> {
		const [last] = await this.durable.list({
			workflowName: workflowName('creator-watch', 'day'),
			status: 'SUCCESS',
			attributes: { cityId },
			sortDesc: true,
			limit: 1,
		});
		return last?.createdAt;
	}
}
