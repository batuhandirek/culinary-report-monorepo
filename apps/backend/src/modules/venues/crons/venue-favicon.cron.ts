import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { OnCron } from 'src/modules/pgboss/decorators/on-cron.decorator.js';

import { VenueFaviconService } from '../services/venue-favicon.service.js';

// Hourly at :20, each run taking due websites for up to `FAVICON_RUN_SECONDS`
export const VENUE_FAVICON_CRON = '20 * * * *';

/** The website icons that are due (`VenueFaviconService.due`): plain fetches, no Apify. */
@Injectable()
export class VenueFaviconCron {
	constructor(
		private readonly orm: MikroORM,
		private readonly venueFaviconService: VenueFaviconService,
	) {}

	@OnCron('venue-favicons', VENUE_FAVICON_CRON, { expireInSeconds: 30 * 60, retryLimit: 0 })
	@EnsureRequestContext()
	async handleCron() {
		await this.venueFaviconService.refreshDue();
	}
}
