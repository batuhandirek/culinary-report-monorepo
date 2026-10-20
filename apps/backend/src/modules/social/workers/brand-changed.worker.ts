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
import { MentionMatchingService } from '../services/mention-matching.service.js';

/**
 * Brands changed: their mentions are matched again (a chain's branch only when the post says
 * which), the cities' accounts too (a merge settles handles two brands shared), then the
 * cities' lead scores are worked out again for the last finished month. Accounts and scores
 * need no LLM, so they run even when the rematch fails (an LLM account out of credits leaves
 * its close calls for the retry); the job then fails with the rematch's error.
 */
@Injectable()
export class BrandChangedWorker {
	constructor(
		private readonly orm: MikroORM,
		private readonly mentionMatchingService: MentionMatchingService,
		private readonly accountMatchingService: AccountMatchingService,
		private readonly cityService: CityService,
		private readonly brandLeadScoreService: BrandLeadScoreService,
	) {}

	// Matching may call the LLM for a few mentions; a retry redoes the same work, never paid scrapes
	@OnJob(BrandChangedJob.jobName, { retryLimit: 2, retryDelay: 60 })
	@EnsureRequestContext()
	async onBrandChanged(job: JobWithMetadata<BrandChangedJobPayload>) {
		let rematchError: unknown;
		try {
			await this.mentionMatchingService.rematchBrands(job.data.brandIds);
		} catch (e) {
			rematchError = e;
		}
		const month = previousMonth();
		for (const cityId of job.data.cityIds) {
			await this.accountMatchingService.match(await this.cityService.getById(cityId));
			await this.brandLeadScoreService.scoreAll(month, cityId);
		}
		if (rematchError) throw rematchError;
	}
}
