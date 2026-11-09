import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { MentionTopicService } from 'src/modules/topics/services/mention-topic.service.js';
import { VenueTopicService } from 'src/modules/topics/services/venue-topic.service.js';
import { CompetitorService } from 'src/modules/venues/services/competitor.service.js';

import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import {
	matchCityNow,
	MatchMentionsWorkflow,
} from '../../match-mentions/workflows/match-mentions.workflow.js';
import { SCRAPE_ACCOUNTS_MONTH } from '../../scrape-accounts/constants/scrape-accounts.constant.js';
import { ScrapeAccountsWorkflow } from '../../scrape-accounts/workflows/scrape-accounts.workflow.js';
import { SCRAPE_VENUE_SOCIAL_MONTH } from '../../scrape-venue-social/constants/scrape-venue-social.constant.js';
import { ScrapeVenueSocialWorkflow } from '../../scrape-venue-social/workflows/scrape-venue-social.workflow.js';
import { ReportBrandsService } from '../../shared/services/report-brands.service.js';
import { runOperation, workflowName } from '../../shared/util/operations.js';

/**
 * The month's report brands that have no competitors get their five best suggestions; a brand with
 * any brand-wide competitor (an admin's or an owner's pick) is left as it is, so a comparison never
 * changes on its own. The report brands are final only once the brands' own posts and the searches
 * by their names are read and matched, so it calls those first; the venues' food tags are brought
 * up to date before suggesting by shared food.
 */
@Injectable()
export class FillCompetitorsWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly reportBrands: ReportBrandsService,
		private readonly competitorService: CompetitorService,
		private readonly mentionTopicService: MentionTopicService,
		private readonly venueTopicService: VenueTopicService,
		private readonly scrapeVenueSocial: ScrapeVenueSocialWorkflow,
		private readonly scrapeAccounts: ScrapeAccountsWorkflow,
		private readonly matchMentions: MatchMentionsWorkflow,
	) {}

	@DurableWorkflow({ name: workflowName('fill-competitors', 'month') })
	@EnsureRequestContext()
	async month(cityId: string, month: string) {
		await runOperation(
			this.durable,
			this.scrapeVenueSocial.month,
			SCRAPE_VENUE_SOCIAL_MONTH,
			cityId,
			month,
		);
		await runOperation(
			this.durable,
			this.scrapeAccounts.month,
			SCRAPE_ACCOUNTS_MONTH,
			cityId,
			month,
		);
		await matchCityNow(this.durable, this.matchMentions, cityId);
		await this.refreshTopics(cityId);
		return this.fill(cityId, month);
	}

	/** The city's mentions' topics, then its venue tags: suggestions read the tags */
	@DurableStep({ name: 'refresh topics' })
	private async refreshTopics(cityId: string): Promise<void> {
		await this.mentionTopicService.relink({ cityId });
		await this.venueTopicService.refreshCity(cityId);
	}

	@DurableStep({ name: PipelineStepEnum.FILL_COMPETITORS })
	private async fill(cityId: string, month: string) {
		const city = await this.cityService.getById(cityId);
		const ids = (await this.reportBrands.of(city, month)).map(b => b.brand.id);
		return { brands: ids.length, ...(await this.competitorService.fill(ids, city.id)) };
	}
}
