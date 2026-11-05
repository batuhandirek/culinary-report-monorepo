import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { mainConfig } from 'src/config/main.config.js';
import { CityService } from 'src/modules/cities/services/city.service.js';

import { ONE_OFF_RUNS, type OneOffRun } from '../constants/pipeline.constant.js';

import { PipelineService } from './pipeline.service.js';

/**
 * Queues the one-off runs a deploy carries (`ONE_OFF_RUNS`) at boot: one per city the monthly cron
 * covers, unless a run of that step with that `key` already exists for the city, whatever its
 * status, so a restart or a later deploy never pays again. A failed one is rerun by hand. Only a
 * production boot queues them: a dev backend on a copy of the production database would pay again.
 */
@Injectable()
export class PipelineBootService implements OnApplicationBootstrap {
	private readonly logger = new Logger(PipelineBootService.name);

	constructor(
		private readonly orm: MikroORM,
		private readonly pipelineService: PipelineService,
		private readonly cityService: CityService,
	) {}

	async onApplicationBootstrap(): Promise<void> {
		if (mainConfig.NODE_ENV !== 'production') return;
		try {
			await this.queueOneOffs();
		} catch (e) {
			// A boot never fails over a one-off: the next boot tries again
			this.logger.error(`One-off runs not queued: ${(e as Error).message}`);
		}
	}

	@EnsureRequestContext()
	async queueOneOffs(now = new Date(), oneOffs: OneOffRun[] = ONE_OFF_RUNS): Promise<number> {
		let queued = 0;
		const month = now.toISOString().slice(0, 7);
		for (const oneOff of oneOffs)
			for (const city of await this.cityService.forMonthlyCron()) {
				const existing = await this.orm.em.getConnection().execute<{ n: number }[]>(
					`select count(*)::int n from pipeline_runs where city_id = ? and step = ? and params->>'key' = ?`,
					[city.id, oneOff.step, oneOff.key],
				);
				if (existing[0].n > 0) continue;
				await this.pipelineService.queue(city.id, oneOff.step, oneOff.month ?? month, {
					...oneOff.params,
					key: oneOff.key,
				});
				this.logger.log(`Queued the one-off ${oneOff.key} (${oneOff.step}) for ${city.name}`);
				queued++;
			}
		return queued;
	}
}
