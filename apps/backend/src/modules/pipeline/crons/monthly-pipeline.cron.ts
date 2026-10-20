import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { OnCron } from 'src/modules/pgboss/decorators/on-cron.decorator.js';
import { CITY_VENUE_SCRAPE_EVERY_MONTHS } from 'src/modules/venues/constants/venue-status.constant.js';
import { previousMonth } from 'src/modules/venues/util/month.js';

import { PipelineStepEnum } from '../constants/pipeline.constant.js';
import { PipelineService } from '../services/pipeline.service.js';
import { cityVenueScrapeDue, MONTHLY_PIPELINE_CRON } from '../util/monthly-schedule.js';

@Injectable()
export class MonthlyPipelineCron {
	constructor(
		private readonly orm: MikroORM,
		private readonly pipelineService: PipelineService,
		private readonly cityService: CityService,
	) {}

	// The month that just ended (`MONTHLY_PIPELINE_CRON`), one run per active city with the cron
	// on; a quarter after its last Places list, the city's `SCRAPE_VENUES` first (openings and
	// closures, and new venues for matching), then `SEARCH_BRANCHES` (new branches of its brands)
	@OnCron('monthly-pipeline', MONTHLY_PIPELINE_CRON)
	@EnsureRequestContext()
	async handleCron() {
		await this.queueRuns(new Date());
	}

	/** The cron's work at `now` (the handler itself is called with the pg-boss job). */
	async queueRuns(now: Date) {
		const month = previousMonth(now);
		for (const city of await this.cityService.forMonthlyCron()) {
			if (cityVenueScrapeDue(city.venuesScrapedAt, now, CITY_VENUE_SCRAPE_EVERY_MONTHS)) {
				await this.pipelineService.queue(city.id, PipelineStepEnum.SCRAPE_VENUES, month);
				await this.pipelineService.queue(city.id, PipelineStepEnum.SEARCH_BRANCHES, month);
			}
			await this.pipelineService.queue(city.id, PipelineStepEnum.MONTHLY, month);
		}
	}
}
