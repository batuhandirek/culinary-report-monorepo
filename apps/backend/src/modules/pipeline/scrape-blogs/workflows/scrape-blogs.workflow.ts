import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { BlogScrapeService } from 'src/modules/social/services/blog-scrape.service.js';

import { PipelineStepEnum } from '../../constants/pipeline.constant.js';
import { workflowName } from '../../shared/util/operations.js';

/** The city's food blogs through their feeds, free: every article not stored yet is a post */
@Injectable()
export class ScrapeBlogsWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly cityService: CityService,
		private readonly blogScrapeService: BlogScrapeService,
	) {}

	@DurableWorkflow({ name: workflowName('scrape-blogs', 'month') })
	@EnsureRequestContext()
	async month(cityId: string, _month: string) {
		return this.scrapeBlogs(cityId);
	}

	@DurableWorkflow({ name: workflowName('scrape-blogs', 'week') })
	@EnsureRequestContext()
	async week(cityId: string, _week: string) {
		return this.scrapeBlogs(cityId);
	}

	@DurableStep({ name: PipelineStepEnum.SCRAPE_BLOGS })
	private async scrapeBlogs(cityId: string) {
		return this.blogScrapeService.scrapeCity(await this.cityService.getById(cityId));
	}
}
