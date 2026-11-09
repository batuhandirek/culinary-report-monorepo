import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';

import { READ_MENTIONED_PROFILES_WEEK } from '../../read-mentioned-profiles/constants/read-mentioned-profiles.constant.js';
import { ReadMentionedProfilesWorkflow } from '../../read-mentioned-profiles/workflows/read-mentioned-profiles.workflow.js';
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

import { LookupVenuesWorkflow } from './lookup-venues.workflow.js';

/**
 * The week's lookups: what the week's scrapes and the profiles their posts tag named (a business
 * profile is searched by its address), so a place posts named is on the map within a week. A class
 * of its own: the brand scrapes it calls each call the month's lookups for their own month.
 */
@Injectable()
export class LookupVenuesWeekWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly lookupVenues: LookupVenuesWorkflow,
		private readonly scrapeTiktok: ScrapeTiktokWorkflow,
		private readonly scrapeInstagram: ScrapeInstagramWorkflow,
		private readonly scrapeBlogs: ScrapeBlogsWorkflow,
		private readonly scrapeAccounts: ScrapeAccountsWorkflow,
		private readonly scrapeVenueSocial: ScrapeVenueSocialWorkflow,
		private readonly readMentionedProfiles: ReadMentionedProfilesWorkflow,
	) {}

	@DurableWorkflow({ name: workflowName('lookup-venues', 'week') })
	@EnsureRequestContext()
	async week(cityId: string, week: string) {
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
		await runOperation(
			this.durable,
			this.readMentionedProfiles.week,
			READ_MENTIONED_PROFILES_WEEK,
			cityId,
			week,
		);
		return this.lookupVenues.lookUpAndMatch(cityId);
	}
}
