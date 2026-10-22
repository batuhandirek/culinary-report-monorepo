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
	// closures, and new venues for matching) and `SEARCH_BRANCHES` (new branches of its brands);
	// every month, for a city with an OSM boundary, `SYNC_OSM_PLACES` (free) and
	// `LOOKUP_OSM_PLACES` (only places never searched), so the list fills before the month's
	// mentions are matched
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
			// After the Places list, so the sync links against the newest venues
			if (city.osmRelationId) {
				await this.pipelineService.queue(city.id, PipelineStepEnum.SYNC_OSM_PLACES, month);
				await this.pipelineService.queue(city.id, PipelineStepEnum.LOOKUP_OSM_PLACES, month);
			}
			await this.pipelineService.queue(city.id, PipelineStepEnum.MONTHLY, month);
		}
	}
}
