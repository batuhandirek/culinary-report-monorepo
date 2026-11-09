import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableSchedule } from 'src/modules/durable-workflows/decorators/durable-schedule.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';

import { cronCities } from '../../shared/util/cron-cities.js';
import { READ_POSTS_CRON } from '../constants/read-posts.constant.js';
import { readCityNow } from '../util/read-city-now.js';
import { ReadPostsWorkflow } from '../workflows/read-posts.workflow.js';

/** Hourly: each cron city's unread posts read (`ReadPostsWorkflow.readCity`), one run in flight per city */
@Injectable()
export class ReadPostsSchedule {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly workflow: ReadPostsWorkflow,
	) {}

	@DurableSchedule('read-posts', READ_POSTS_CRON)
	@EnsureRequestContext()
	async hourly(): Promise<void> {
		// Started, never awaited: each city's run governs itself
		for (const city of await cronCities(this.durable, this.cityService))
			await readCityNow(this.durable, this.workflow, city.id, { await: false });
	}
}
