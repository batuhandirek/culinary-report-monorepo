import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { CityService } from 'src/modules/cities/services/city.service.js';
import { OnCron } from 'src/modules/pgboss/decorators/on-cron.decorator.js';

import { IngestionService } from '../services/ingestion.service.js';
import { PipelineService } from '../services/pipeline.service.js';
import { INGESTION_CRON } from '../util/monthly-schedule.js';

@Injectable()
export class IngestionCron {
	constructor(
		private readonly orm: MikroORM,
		private readonly ingestionService: IngestionService,
		private readonly pipelineService: PipelineService,
		private readonly cityService: CityService,
	) {}

	// Hourly (`INGESTION_CRON`): a reading pass per city the monthly cron covers, so what a model
	// refused to read is read within the hour it answers again, and every waiting run checks again
	// (one past its wait goes on with what is read)
	@OnCron('pipeline-ingest-hourly', INGESTION_CRON)
	@EnsureRequestContext()
	async handleCron() {
		await this.queueAll();
	}

	async queueAll(): Promise<void> {
		for (const city of await this.cityService.forMonthlyCron()) {
			await this.ingestionService.queue(city.id);
			await this.pipelineService.wakeWaiting(city.id);
		}
	}
}
