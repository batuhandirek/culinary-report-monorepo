import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { BrandLeadScoreService } from 'src/modules/venues/services/brand-lead-score.service.js';

import {
	classifyPressOfCity,
	ClassifyPressWorkflow,
} from '../../classify-press/workflows/classify-press.workflow.js';
import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import {
	matchCityNow,
	MatchMentionsWorkflow,
} from '../../match-mentions/workflows/match-mentions.workflow.js';
import {
	readReviewsOfCity,
	ReadReviewsWorkflow,
} from '../../read-reviews/workflows/read-reviews.workflow.js';
import { SCRAPE_PRESS_MONTH } from '../../scrape-press/constants/scrape-press.constant.js';
import { ScrapePressWorkflow } from '../../scrape-press/workflows/scrape-press.workflow.js';
import { SCRAPE_REVIEWS_MONTH } from '../../scrape-reviews/constants/scrape-reviews.constant.js';
import { ScrapeReviewsWorkflow } from '../../scrape-reviews/workflows/scrape-reviews.workflow.js';
import { runOperation, workflowName } from '../../shared/util/operations.js';

/**
 * The outreach lead score of every brand with an open branch in the city, over the month and the
 * one before (free): it reads the month's reviews and press, so it calls their scrapes and their
 * reading first, and the posts read and matched.
 */
@Injectable()
export class ScoreLeadsWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly brandLeadScoreService: BrandLeadScoreService,
		private readonly scrapeReviews: ScrapeReviewsWorkflow,
		private readonly scrapePress: ScrapePressWorkflow,
		private readonly readReviews: ReadReviewsWorkflow,
		private readonly classifyPress: ClassifyPressWorkflow,
		private readonly matchMentions: MatchMentionsWorkflow,
	) {}

	@DurableWorkflow({ name: workflowName('score-leads', 'month') })
	@EnsureRequestContext()
	async month(cityId: string, month: string) {
		await runOperation(
			this.durable,
			this.scrapeReviews.month,
			SCRAPE_REVIEWS_MONTH,
			cityId,
			month,
		);
		await runOperation(this.durable, this.scrapePress.month, SCRAPE_PRESS_MONTH, cityId, month);
		await matchCityNow(this.durable, this.matchMentions, cityId);
		await readReviewsOfCity(this.durable, this.readReviews, cityId);
		await classifyPressOfCity(this.durable, this.classifyPress, cityId);
		return this.scoreLeads(cityId, month);
	}

	@DurableStep({ name: PipelineStepEnum.SCORE_LEADS })
	private async scoreLeads(cityId: string, month: string) {
		return this.brandLeadScoreService.scoreAll(month, cityId);
	}
}
