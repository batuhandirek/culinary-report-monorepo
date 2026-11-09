import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableSchedule } from 'src/modules/durable-workflows/decorators/durable-schedule.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';

import { startPerCronCity } from '../../shared/util/cron-cities.js';
import { READ_REVIEWS_CRON } from '../constants/read-reviews.constant.js';
import { READ_REVIEWS_CITY_QUEUE } from '../queues/read-reviews.queue.js';
import { ReadReviewsWorkflow } from '../workflows/read-reviews.workflow.js';

/** Hourly: every cron city's unread written reviews, each its own workflow (`ReadReviewsWorkflow.readCity`) */
@Injectable()
export class ReadReviewsSchedule {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly workflow: ReadReviewsWorkflow,
	) {}

	@DurableSchedule('read-reviews', READ_REVIEWS_CRON)
	@EnsureRequestContext()
	async hourly(): Promise<void> {
		await startPerCronCity(
			this.durable,
			this.cityService,
			this.workflow.readCity,
			city => [city.id],
			{ queue: READ_REVIEWS_CITY_QUEUE, purpose: 'read-reviews' },
		);
	}
}
