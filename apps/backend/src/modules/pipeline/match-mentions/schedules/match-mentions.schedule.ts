import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { DurableSchedule } from 'src/modules/durable-workflows/decorators/durable-schedule.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';

import { cronCities } from '../../shared/util/cron-cities.js';
import { MATCH_MENTIONS_CRON } from '../constants/match-mentions.constant.js';
import { matchCityNow, MatchMentionsWorkflow } from '../workflows/match-mentions.workflow.js';

/** Hourly: each cron city's mentions matched (`MatchMentionsWorkflow.matchCity`), one run in flight per city */
@Injectable()
export class MatchMentionsSchedule {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly cityService: CityService,
		private readonly workflow: MatchMentionsWorkflow,
	) {}

	@DurableSchedule('match-mentions', MATCH_MENTIONS_CRON)
	@EnsureRequestContext()
	async hourly(): Promise<void> {
		for (const city of await cronCities(this.durable, this.cityService))
			await matchCityNow(this.durable, this.workflow, city.id, { await: false });
	}
}
