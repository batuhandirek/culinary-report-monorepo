import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { JobWithMetadata } from 'pg-boss';

import { OnJob } from 'src/modules/pgboss/decorators/on-job.decorator.js';

import { TopicCityRefreshJob, TopicCityRefreshJobPayload } from '../jobs/topic-city-refresh.job.js';
import { MenuTermService } from '../services/menu-term.service.js';
import { TopicService } from '../services/topic.service.js';
import { VenueTopicService } from '../services/venue-topic.service.js';

@Injectable()
export class TopicCityRefreshWorker {
	constructor(
		private readonly orm: MikroORM,
		private readonly topicService: TopicService,
		private readonly venueTopicService: VenueTopicService,
		private readonly menuTermService: MenuTermService,
	) {}

	// Stately per city: one refresh runs and one waits. Pure matching, so a retry is cheap. The job
	// follows every reading and matching, so the menus' wordings are matched here too: a new
	// review's "banging bangkok burger" finds its menu item
	@OnJob(TopicCityRefreshJob.jobName, { policy: 'stately', retryLimit: 2, retryDelay: 60, expireInSeconds: 30 * 60 })
	@EnsureRequestContext()
	async onTopicCityRefresh(job: JobWithMetadata<TopicCityRefreshJobPayload>) {
		const index = await this.topicService.index();
		await this.venueTopicService.refreshCity(job.data.cityId, index);
		await this.menuTermService.relinkCity(job.data.cityId);
	}
}
