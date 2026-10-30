import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { JobWithMetadata } from 'pg-boss';

import { OnJob } from 'src/modules/pgboss/decorators/on-job.decorator.js';

import { TopicCityRefreshJob, TopicCityRefreshJobPayload } from '../jobs/topic-city-refresh.job.js';
import { TopicService } from '../services/topic.service.js';
import { MentionTopicService } from '../services/mention-topic.service.js';
import { VenueTopicService } from '../services/venue-topic.service.js';

@Injectable()
export class TopicCityRefreshWorker {
	constructor(
		private readonly orm: MikroORM,
		private readonly topicService: TopicService,
		private readonly mentionTopicService: MentionTopicService,
		private readonly venueTopicService: VenueTopicService,
	) {}

	// Stately per city: one refresh runs and one waits. Pure matching, so a retry is cheap
	@OnJob(TopicCityRefreshJob.jobName, { policy: 'stately', retryLimit: 2, retryDelay: 60, expireInSeconds: 30 * 60 })
	@EnsureRequestContext()
	async onTopicCityRefresh(job: JobWithMetadata<TopicCityRefreshJobPayload>) {
		const index = await this.topicService.index();
		// The mentions first: a venue's tags read their topics
		await this.mentionTopicService.relink({ cityId: job.data.cityId, index });
		await this.venueTopicService.refreshCity(job.data.cityId, index);
	}
}
