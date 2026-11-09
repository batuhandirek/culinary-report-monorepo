import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import type { WorkflowHandle } from '@dbos-inc/dbos-sdk';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { stepBudgetUsd } from 'src/modules/cities/util/city.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow } from 'src/modules/durable-workflows/util/durable-steps.js';
import { DurableLlmService } from 'src/modules/llm/services/durable-llm.service.js';
import { withLlmCallContext } from 'src/modules/llm/util/llm-call-context.js';
import type { DurableGenerateResult } from 'src/modules/llm/workflows/llm.workflow.js';
import { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';
import {
	AccountMatchingService,
	type AccountMatchResult,
} from 'src/modules/social/services/account-matching.service.js';
import {
	AccountScrapeService,
	PROFILE_ONLY_USD,
} from 'src/modules/social/services/account-scrape.service.js';
import { MentionMatchingService } from 'src/modules/social/services/mention-matching.service.js';
import { ProfilePlaceService } from 'src/modules/social/services/profile-place.service.js';
import { VenueScrapeSourceEnum } from 'src/modules/venues/constants/venue-status.constant.js';

import { PlacesWorkflow } from '../../atoms/places/workflows/places.workflow.js';
import { InstagramProfilesWorkflow } from '../../atoms/instagram-profiles/workflows/instagram-profiles.workflow.js';
import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import {
	matchCityNow,
	MatchMentionsWorkflow,
} from '../../match-mentions/workflows/match-mentions.workflow.js';
import { SCRAPE_ACCOUNTS_WEEK } from '../../scrape-accounts/constants/scrape-accounts.constant.js';
import { ScrapeAccountsWorkflow } from '../../scrape-accounts/workflows/scrape-accounts.workflow.js';
import { SCRAPE_BLOGS_WEEK } from '../../scrape-blogs/constants/scrape-blogs.constant.js';
import { ScrapeBlogsWorkflow } from '../../scrape-blogs/workflows/scrape-blogs.workflow.js';
import { SCRAPE_INSTAGRAM_WEEK } from '../../scrape-instagram/constants/scrape-instagram.constant.js';
import { ScrapeInstagramWorkflow } from '../../scrape-instagram/workflows/scrape-instagram.workflow.js';
import { SCRAPE_TIKTOK_WEEK } from '../../scrape-tiktok/constants/scrape-tiktok.constant.js';
import { ScrapeTiktokWorkflow } from '../../scrape-tiktok/workflows/scrape-tiktok.workflow.js';
import { SCRAPE_VENUE_SOCIAL_WEEK } from '../../scrape-venue-social/constants/scrape-venue-social.constant.js';
import { ScrapeVenueSocialWorkflow } from '../../scrape-venue-social/workflows/scrape-venue-social.workflow.js';
import { runOperation, workflowName } from '../../shared/util/operations.js';
import { MENTIONED_PROFILES_SHARE } from '../constants/read-mentioned-profiles.constant.js';

/** What one city's run did: the workflow's result, part by part */
export interface ReadMentionedProfilesResult {
	/** Accounts made for handles never seen before */
	created: number;
	profiles: {
		unread: number;
		asked: number;
		read: number;
		businesses: number;
		snapshots: number;
	};
	accounts: AccountMatchResult;
	addresses: { due: number; searched: number; found: number; saved: number };
	accountsAfterSearch?: AccountMatchResult;
	places: { asked: number; suggested: number };
	matched: Record<string, number>;
}

/**
 * `READ_MENTIONED_PROFILES` as a workflow of its own, one run per city and week: started by
 * `ReadMentionedProfilesSchedule` and by the week's lookups, which need its accounts. Every Instagram handle the city's posts tag or its profiles'
 * bios name becomes an account; the profiles never read are read (one `instagram-profiles.run`, a child
 * workflow), the accounts matched by what their profiles say, the business profiles whose bio
 * address names none of our places searched on Google Maps (a child), matched again,
 * `ProfilePlaceAgent` asked which place at the address a profile is (one LLM call workflow per
 * profile), and the mentions their tags place matched.
 *
 * Every part is a step (a `@DurableStep` method, its result stored) or a child workflow (an actor
 * run, an agent call): a deploy or crash resumes exactly where the run was, and the admin sees each part under
 * `/admin/workflows`. The week's scrapes it reads the tags of are its own dependencies, called
 * under their one id, so they are done once whoever asks first.
 */
@Injectable()
export class ReadMentionedProfilesWorkflow {
	private readonly logger = new Logger(ReadMentionedProfilesWorkflow.name);

	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly durableLlm: DurableLlmService,
		private readonly cityService: CityService,
		private readonly accountMatchingService: AccountMatchingService,
		private readonly accountScrapeService: AccountScrapeService,
		private readonly profilePlaceService: ProfilePlaceService,
		private readonly mentionMatchingService: MentionMatchingService,
		private readonly places: PlacesWorkflow,
		private readonly instagramProfiles: InstagramProfilesWorkflow,
		private readonly scrapeTiktok: ScrapeTiktokWorkflow,
		private readonly scrapeInstagram: ScrapeInstagramWorkflow,
		private readonly scrapeBlogs: ScrapeBlogsWorkflow,
		private readonly scrapeAccounts: ScrapeAccountsWorkflow,
		private readonly scrapeVenueSocial: ScrapeVenueSocialWorkflow,
		private readonly matchMentions: MatchMentionsWorkflow,
	) {}

	/**
	 * One city's week: the week's scrapes first (their posts' tags), read and matched (a skipped
	 * post's tags go last), then the run. Its LLM calls are filed under the city and
	 * `read-mentioned-profiles`.
	 */
	@DurableWorkflow({ name: workflowName('read-mentioned-profiles', 'week') })
	@EnsureRequestContext()
	async week(cityId: string, week: string): Promise<ReadMentionedProfilesResult> {
		await runOperation(this.durable, this.scrapeTiktok.week, SCRAPE_TIKTOK_WEEK, cityId, week);
		await runOperation(
			this.durable,
			this.scrapeInstagram.week,
			SCRAPE_INSTAGRAM_WEEK,
			cityId,
			week,
		);
		await runOperation(this.durable, this.scrapeBlogs.week, SCRAPE_BLOGS_WEEK, cityId, week);
		await runOperation(
			this.durable,
			this.scrapeAccounts.week,
			SCRAPE_ACCOUNTS_WEEK,
			cityId,
			week,
		);
		await runOperation(
			this.durable,
			this.scrapeVenueSocial.week,
			SCRAPE_VENUE_SOCIAL_WEEK,
			cityId,
			week,
		);
		await matchCityNow(this.durable, this.matchMentions, cityId);
		return withLlmCallContext({ cityId, purpose: 'read-mentioned-profiles' }, () =>
			this.run(cityId),
		);
	}

	private async run(cityId: string): Promise<ReadMentionedProfilesResult> {
		const now = await durableNow(this.durable);
		const budget = await this.budget(cityId);

		// 1. Every tagged or named handle is an account
		const created = await this.addMentionedAccounts(cityId);

		// 2. The profiles never read: planned, one `instagram-profiles.run` (a child: the actor run on the
		// `apify` queue, the profiles stored on their accounts)
		const plan = await this.planProfileReads(cityId, budget * MENTIONED_PROFILES_SHARE, now);
		const read =
			plan.call ?
				await this.instagramProfiles.call({
					...plan.call,
					cityId,
					now: now.toISOString(),
					save: { accounts: 'all' },
				})
			:	null;
		const asked = plan.call?.handles.length ?? 0;

		// 3. The accounts matched by what their profiles say
		const accounts = await this.matchAccounts(cityId);

		// 4. Business profiles whose bio address names none of our places: planned, one Google Maps
		// run (the `places` atom, a child: typed searches, the places saved), the profiles stamped
		const left = budget - asked * PROFILE_ONLY_USD[SocialPlatformEnum.INSTAGRAM];
		const searchPlan = await this.planAddressSearches(cityId, left);
		const found =
			searchPlan.picked.length ?
				await this.places.call({
					cityId,
					search: {
						mode: 'typed',
						queries: searchPlan.picked.map(p => p.search),
						perQuery: searchPlan.perSearch,
					},
					maxCostUsd: searchPlan.capUsd,
					purpose: `google-places profile addresses: ${searchPlan.picked.length}`,
					save: { source: VenueScrapeSourceEnum.LOOKUP, newPlaces: 'food-in-city' },
				})
			:	null;
		const addresses = await this.saveAddressSearches(
			cityId,
			searchPlan.picked.map(p => p.accountId),
			{ found: found?.found ?? 0, saved: found?.saved ?? 0 },
			now,
		);
		const accountsAfterSearch =
			addresses.saved > 0 ? await this.matchAccounts(cityId) : undefined;

		// 5. Where places are at an address but none is named like the profile: the agent, one call
		// workflow per profile, every call started before any answer is awaited
		const questions = await this.planPlaceQuestions(cityId);
		const handles: WorkflowHandle<DurableGenerateResult<{ venueId: string | null }>>[] = [];
		for (const question of questions)
			handles.push(
				await this.durableLlm.start(this.profilePlaceService.agent, question.prompt),
			);
		const places = { asked: 0, suggested: 0 };
		for (const [index, question] of questions.entries()) {
			const answer = await handles[index].getResult();
			places.asked++;
			// A step of its own per profile, named after it (a decorator's name is fixed)
			const suggested = await this.durable.step(`record @${question.handle}`, () =>
				this.profilePlaceService.recordPlaceAnswer(question, answer.object.venueId, now),
			);
			if (suggested) places.suggested++;
		}

		// 6. The mentions the linked accounts' tags now place
		const matched = await this.matchByTags(cityId);

		this.logger.log(
			`Mentioned profiles of city ${cityId}: ${read?.profiles ?? 0} of ${asked} profiles read, ${searchPlan.picked.length} addresses searched, ${places.suggested} of ${places.asked} places suggested`,
		);
		return {
			created,
			profiles: {
				unread: plan.unread,
				asked,
				read: read?.profiles ?? 0,
				businesses: read?.businesses ?? 0,
				snapshots: read?.snapshots ?? 0,
			},
			accounts,
			addresses: { due: searchPlan.due, searched: searchPlan.picked.length, ...addresses },
			...(accountsAfterSearch && { accountsAfterSearch }),
			places,
			matched,
		};
	}

	// ─── Steps: each a checkpoint (its result stored), a plain call outside DBOS ───

	/** The city's budget for the run (`stepBudgetsUsd[READ_MENTIONED_PROFILES]`, else the default) */
	@DurableStep({ name: 'budget' })
	private async budget(cityId: string): Promise<number> {
		return stepBudgetUsd(
			await this.cityService.getById(cityId),
			PipelineStepEnum.READ_MENTIONED_PROFILES,
		);
	}

	/** Every handle the city's posts tag or its profiles' bios name made an account; how many were new */
	@DurableStep({ name: 'mentioned accounts' })
	private async addMentionedAccounts(cityId: string) {
		return this.accountMatchingService.addMentionedAccounts(
			await this.cityService.getById(cityId),
		);
	}

	/** The profiles never read, most mentioned first, as many as `budgetUsd` covers */
	@DurableStep({ name: 'plan profile reads' })
	private async planProfileReads(cityId: string, budgetUsd: number, now: Date) {
		return this.accountScrapeService.planMentionedProfiles(
			await this.cityService.getById(cityId),
			budgetUsd,
			now,
		);
	}

	/** The account matcher over the city (run again after the address searches added places) */
	@DurableStep({ name: 'match accounts' })
	private async matchAccounts(cityId: string): Promise<AccountMatchResult> {
		return this.accountMatchingService.match(await this.cityService.getById(cityId));
	}

	/** The business profiles whose bio address names none of our places, as many searches as `budgetUsd` covers */
	@DurableStep({ name: 'plan address searches' })
	private async planAddressSearches(cityId: string, budgetUsd: number) {
		return this.profilePlaceService.planAddressSearches(
			await this.cityService.getById(cityId),
			budgetUsd,
		);
	}

	/** The searched profiles stamped (the run's places were saved by the atom) */
	@DurableStep({ name: 'save address searches' })
	private async saveAddressSearches(
		cityId: string,
		accountIds: string[],
		found: { found: number; saved: number },
		now: Date,
	) {
		return this.profilePlaceService.saveAddressSearch(
			await this.cityService.getById(cityId),
			accountIds,
			found,
			now,
		);
	}

	/** The profiles whose bio address has places but none named like them: one agent question each */
	@DurableStep({ name: 'plan place questions' })
	private async planPlaceQuestions(cityId: string) {
		return this.profilePlaceService.planPlaceQuestions(await this.cityService.getById(cityId));
	}

	/** The city's unmatched mentions placed by the accounts their posts tag */
	@DurableStep({ name: 'match by tags' })
	private async matchByTags(cityId: string): Promise<Record<string, number>> {
		return this.mentionMatchingService.matchByTags(cityId);
	}
}
