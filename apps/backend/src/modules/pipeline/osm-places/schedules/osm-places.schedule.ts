import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableSchedule } from 'src/modules/durable-workflows/decorators/durable-schedule.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow } from 'src/modules/durable-workflows/util/durable-steps.js';

import { periodAt, startForCronCities } from '../../shared/util/operations.js';
import { OSM_PLACES_MONTH, OSM_PLACES_MONTH_CRON } from '../constants/osm-places.constant.js';
import { OsmPlacesWorkflow } from '../workflows/osm-places.workflow.js';

/** When `OsmPlacesWorkflow` runs by itself: one run per cron city and period, under its one id */
@Injectable()
export class OsmPlacesSchedule {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly workflow: OsmPlacesWorkflow,
	) {}

	// The 2nd: the month that just ended
	@DurableSchedule('osm-places.month', OSM_PLACES_MONTH_CRON)
	@EnsureRequestContext()
	async monthly(): Promise<void> {
		const now = await durableNow(this.durable);
		await startForCronCities(
			this.durable,
			this.cityService,
			this.workflow.month,
			OSM_PLACES_MONTH,
			periodAt('month', now),
		);
	}
}
