import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { OnCron } from 'src/modules/pgboss/decorators/on-cron.decorator.js';

import { VenueFaviconService } from '../services/venue-favicon.service.js';

// Hourly at :20, a small batch each time, so a new city's venues fill within a day or two
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
