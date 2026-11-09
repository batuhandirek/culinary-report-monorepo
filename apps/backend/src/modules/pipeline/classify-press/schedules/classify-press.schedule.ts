import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableSchedule } from 'src/modules/durable-workflows/decorators/durable-schedule.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';

import { startPerCronCity } from '../../shared/util/cron-cities.js';
import { CLASSIFY_PRESS_CRON } from '../constants/classify-press.constant.js';
import { CLASSIFY_PRESS_CITY_QUEUE } from '../queues/classify-press.queue.js';
import { ClassifyPressWorkflow } from '../workflows/classify-press.workflow.js';

/** Hourly: every cron city's unclassified press pages, each its own workflow (`ClassifyPressWorkflow.classifyCity`) */
@Injectable()
export class ClassifyPressSchedule {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly workflow: ClassifyPressWorkflow,
	) {}

	@DurableSchedule('classify-press', CLASSIFY_PRESS_CRON)
	@EnsureRequestContext()
	async hourly(): Promise<void> {
		await startPerCronCity(
			this.durable,
			this.cityService,
			this.workflow.classifyCity,
			city => [city.id],
			{ queue: CLASSIFY_PRESS_CITY_QUEUE, purpose: 'classify-press' },
		);
	}
}
