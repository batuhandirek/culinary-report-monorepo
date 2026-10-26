import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { EntityManager, MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { OnCron } from 'src/modules/pgboss/decorators/on-cron.decorator.js';
import { DishSearchService } from 'src/modules/venues/services/dish-search.service.js';
import { dishSearchDue } from 'src/modules/venues/util/dish-searches.js';
import { calendarDay } from 'src/modules/venues/util/week.js';

import { PipelineStepEnum } from '../constants/pipeline.constant.js';
import { PipelineRun, PipelineRunStatusEnum } from '../entities/pipeline-run.entity.js';
import { PipelineService } from '../services/pipeline.service.js';
import { DISH_SEARCH_CRON } from '../util/monthly-schedule.js';

@Injectable()
export class DishSearchCron {
	constructor(
		private readonly orm: MikroORM,
		private readonly em: EntityManager,
		private readonly pipelineService: PipelineService,
		private readonly cityService: CityService,
		private readonly dishSearchService: DishSearchService,
	) {}

	// Daily (`DISH_SEARCH_CRON`): a `TRACK_DISH_SEARCHES` run for each city the monthly cron
	// covers that has districts and whose newest snapshot is `dishSearchEveryDays` old, unless one
	// is already waiting in the queue (the monthly run can hold it for hours)
	@OnCron('dish-searches', DISH_SEARCH_CRON)
	@EnsureRequestContext()
	async handleCron() {
		await this.queueDue(new Date());
	}

	async queueDue(now: Date): Promise<string[]> {
		const cities = (await this.cityService.forMonthlyCron()).filter(c => c.districts.length);
		const newest = await this.dishSearchService.newestSnapshots(cities.map(c => c.id));
		const waiting = new Set(
			(
				await this.em.find(
					PipelineRun,
					{
						city: { $in: cities.map(c => c.id) },
						step: PipelineStepEnum.TRACK_DISH_SEARCHES,
						status: {
							$in: [PipelineRunStatusEnum.QUEUED, PipelineRunStatusEnum.RUNNING],
						},
					},
					{ fields: ['city'] },
				)
			).map(r => r.city.id),
		);
		const queued: string[] = [];
		for (const city of cities) {
			const today = calendarDay(now, city.timezone);
			if (waiting.has(city.id)) continue;
			if (!dishSearchDue(newest.get(city.id) ?? null, today.date, city.dishSearchEveryDays))
				continue;
			// The run's month is a label: the step snapshots today
			await this.pipelineService.queue(
				city.id,
				PipelineStepEnum.TRACK_DISH_SEARCHES,
				today.month,
			);
			queued.push(city.id);
		}
		return queued;
	}
}
