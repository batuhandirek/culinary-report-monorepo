import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { OnCron } from 'src/modules/pgboss/decorators/on-cron.decorator.js';

import { ASPECT_DISCOVERY_CRON } from '../constants/aspect-discovery.constant.js';
import { AspectDiscoveryService } from '../services/aspect-discovery.service.js';

@Injectable()
export class AspectDiscoveryCron {
	constructor(
		private readonly orm: MikroORM,
		private readonly aspectDiscoveryService: AspectDiscoveryService,
	) {}

	// Weekly (`ASPECT_DISCOVERY_CRON`); the work runs as the `aspect-discovery` job, so a boot run
	// and the cron share one queue and never overlap
	@OnCron('aspect-discovery', ASPECT_DISCOVERY_CRON)
	@EnsureRequestContext()
	async handleCron() {
		await this.aspectDiscoveryService.queue({ dryRun: false, cronOnly: true });
	}
}
