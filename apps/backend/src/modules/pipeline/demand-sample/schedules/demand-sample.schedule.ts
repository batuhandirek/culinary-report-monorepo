import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableSchedule } from 'src/modules/durable-workflows/decorators/durable-schedule.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { calendarDay } from 'src/modules/venues/util/week.js';

import { operationRunId } from '../../shared/util/operations.js';
import {
	DEMAND_SAMPLE_CRON,
	SAMPLE_BUSYNESS_DAY,
	SAMPLE_RESERVATIONS_DAY,
} from '../constants/demand-sample.constant.js';
import { dueDemandSamples } from '../util/demand-schedule.js';
import { DemandSampleWorkflow } from '../workflows/demand-sample.workflow.js';

/** Hourly: each cron city's samples due at 19:00 its own time, under its local day */
@Injectable()
export class DemandSampleSchedule {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly workflow: DemandSampleWorkflow,
	) {}

	@DurableSchedule('demand-sample', DEMAND_SAMPLE_CRON)
	@EnsureRequestContext()
	async hourly(): Promise<void> {
		for (const due of await this.dueCities()) {
			if (due.busyness)
				await this.durable.start(this.workflow.busyness, [due.cityId, due.day], {
					queue: SAMPLE_BUSYNESS_DAY.queue,
					workflowId: operationRunId(SAMPLE_BUSYNESS_DAY, due.cityId, due.day),
					attributes: {
						cityId: due.cityId,
						purpose: SAMPLE_BUSYNESS_DAY.operation,
						period: due.day,
					},
				});
			if (due.reservations)
				await this.durable.start(this.workflow.reservations, [due.cityId, due.day], {
					queue: SAMPLE_RESERVATIONS_DAY.queue,
					workflowId: operationRunId(SAMPLE_RESERVATIONS_DAY, due.cityId, due.day),
					attributes: {
						cityId: due.cityId,
						purpose: SAMPLE_RESERVATIONS_DAY.operation,
						period: due.day,
					},
				});
		}
	}

	/** The cron cities in their sampling hour, with what is due and their local day */
	private dueCities() {
		return this.durable.step('due cities', async () => {
			const now = new Date();
			return (await this.cityService.forMonthlyCron())
				.map(city => ({
					cityId: city.id,
					day: calendarDay(now, city.timezone).date,
					...dueDemandSamples(now, city.timezone),
				}))
				.filter(d => d.busyness || d.reservations);
		});
	}
}
