import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { JobWithMetadata } from 'pg-boss';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { OnJob } from 'src/modules/pgboss/decorators/on-job.decorator.js';
import {
	BrandChangedJob,
	BrandChangedJobPayload,
} from 'src/modules/venues/jobs/brand-changed.job.js';
import { BrandLeadScoreService } from 'src/modules/venues/services/brand-lead-score.service.js';
import { previousMonth } from 'src/modules/venues/util/month.js';

import { AccountMatchingService } from '../services/account-matching.service.js';
import { HashtagService } from '../services/hashtag.service.js';
import { MentionMatchingService } from '../services/mention-matching.service.js';

/**
 * Brands changed: their mentions are matched again in code (a chain's branch only when the post
 * says which; a close call keeps its match until the city's next matching run asks the agent,
 * `match-mentions.mention`), the cities' accounts too (a merge settles handles two brands
 * shared), then the cities' lead scores are worked out again for the last finished month, and
 * hashtags' brands checked again (a merge or rename moves which brand a tag names). No LLM.
 */
@Injectable()
export class BrandChangedWorker {
	constructor(
		private readonly orm: MikroORM,
		private readonly mentionMatchingService: MentionMatchingService,
		private readonly accountMatchingService: AccountMatchingService,
		private readonly cityService: CityService,
		private readonly brandLeadScoreService: BrandLeadScoreService,
		private readonly hashtagService: HashtagService,
	) {}

	// Free work: a retry redoes it, never a paid call
	@OnJob(BrandChangedJob.jobName, { retryLimit: 2, retryDelay: 60 })
	@EnsureRequestContext()
	async onBrandChanged(job: JobWithMetadata<BrandChangedJobPayload>) {
		await this.mentionMatchingService.rematchBrands(job.data.brandIds);
		const month = previousMonth();
		for (const cityId of job.data.cityIds) {
			await this.accountMatchingService.match(await this.cityService.getById(cityId));
			await this.brandLeadScoreService.scoreAll(month, cityId);
		}
		await this.hashtagService.relink();
	}
}
