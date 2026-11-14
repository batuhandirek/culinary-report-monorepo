import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { ITEM_RUN_KEEP_DAYS } from 'src/modules/durable-workflows/constants/durable-workflows.constant.js';
import { DurableSchedule } from 'src/modules/durable-workflows/decorators/durable-schedule.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';

import { startPerCronCity } from '../../shared/util/cron-cities.js';
import { READ_COMMENTS_CRON } from '../constants/read-comments.constant.js';
import { READ_COMMENTS_CITY_QUEUE } from '../queues/read-comments.queue.js';
import { ReadCommentsWorkflow } from '../workflows/read-comments.workflow.js';

/** Hourly: every cron city's posts with unread comments, each post its own workflow (`ReadCommentsWorkflow.readCity`) */
@Injectable()
export class ReadCommentsSchedule {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly workflow: ReadCommentsWorkflow,
	) {}

	@DurableSchedule('read-comments', READ_COMMENTS_CRON, { keepDays: ITEM_RUN_KEEP_DAYS })
	@EnsureRequestContext()
	async hourly(): Promise<void> {
		await startPerCronCity(
			this.durable,
			this.cityService,
			this.workflow.readCity,
			city => [city.id],
			{ queue: READ_COMMENTS_CITY_QUEUE, purpose: 'read-comments' },
		);
	}
}
