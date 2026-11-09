import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableSchedule } from 'src/modules/durable-workflows/decorators/durable-schedule.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { DishSearchService } from 'src/modules/venues/services/dish-search.service.js';
import { dishSearchDue } from 'src/modules/venues/util/dish-searches.js';
import { calendarDay } from 'src/modules/venues/util/week.js';

import { operationRunId } from '../../shared/util/operations.js';
import { DISH_SEARCHES_DAY, DISH_SEARCHES_DAY_CRON } from '../constants/dish-searches.constant.js';
import { DishSearchesWorkflow } from '../workflows/dish-searches.workflow.js';

/**
 * Daily: a snapshot for each cron city with districts whose newest one is
 * `City.dishSearchEveryDays` old (0 is off), under the city's local day as its period
 */
@Injectable()
export class DishSearchesSchedule {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly dishSearchService: DishSearchService,
		private readonly workflow: DishSearchesWorkflow,
	) {}

	@DurableSchedule('dish-searches.day', DISH_SEARCHES_DAY_CRON)
	@EnsureRequestContext()
	async daily(): Promise<void> {
		for (const { cityId, day } of await this.dueCities())
			await this.durable.start(this.workflow.day, [cityId, day], {
				queue: DISH_SEARCHES_DAY.queue,
				workflowId: operationRunId(DISH_SEARCHES_DAY, cityId, day),
				attributes: { cityId, purpose: DISH_SEARCHES_DAY.operation, period: day },
			});
	}

	/** The cron cities with districts whose snapshot is due, each with its local day */
	private dueCities(): Promise<{ cityId: string; day: string }[]> {
		return this.durable.step('due cities', async () => {
			const now = new Date();
			const cities = (await this.cityService.forMonthlyCron()).filter(
				c => c.districts.length,
			);
			const newest = await this.dishSearchService.newestSnapshots(cities.map(c => c.id));
			return cities
				.map(city => ({ city, day: calendarDay(now, city.timezone).date }))
				.filter(({ city, day }) =>
					dishSearchDue(newest.get(city.id) ?? null, day, city.dishSearchEveryDays),
				)
				.map(({ city, day }) => ({ cityId: city.id, day }));
		});
	}
}
