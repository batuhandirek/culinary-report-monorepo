import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { OnCron } from 'src/modules/pgboss/decorators/on-cron.decorator.js';
import { previousMonth } from 'src/modules/venues/util/month.js';

import { PipelineService } from '../services/pipeline.service.js';
import { DEMAND_SAMPLE_CRON, dueDemandSteps } from '../util/demand-schedule.js';

@Injectable()
export class DemandSampleCron {
	constructor(
		private readonly orm: MikroORM,
		private readonly pipelineService: PipelineService,
		private readonly cityService: CityService,
	) {}

	// Hourly; each city with the monthly cron on is sampled at 19:00 its time on Thursdays and
	// Saturdays (`dueDemandSteps`), for the venues of its last report month
	@OnCron('demand-sample', DEMAND_SAMPLE_CRON)
	@EnsureRequestContext()
	async handleCron() {
		await this.queueDue(new Date());
	}

	/** Queues the demand steps due at `now` in each city's time zone. */
	async queueDue(now: Date): Promise<void> {
		const month = previousMonth(now);
		for (const city of await this.cityService.forMonthlyCron()) {
			for (const step of dueDemandSteps(now, city.timezone)) {
				await this.pipelineService.queue(city.id, step, month);
			}
		}
	}
}
