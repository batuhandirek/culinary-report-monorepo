import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { OnCron } from 'src/modules/pgboss/decorators/on-cron.decorator.js';

import { LANDING_CRON } from '../constants/landing.constant.js';
import { LandingEditionService } from '../services/landing-edition.service.js';

/**
 * Daily (`LANDING_CRON`): a build queued for every city whose front page edition is five days
 * old (`LANDING_REFRESH_DAYS`). Daily rather than every fifth day of the month, so the rhythm
 * survives month ends and a missed day.
 */
@Injectable()
export class LandingEditionCron {
	constructor(
		private readonly orm: MikroORM,
		private readonly landingEditionService: LandingEditionService,
	) {}

	@OnCron('landing-editions', LANDING_CRON)
	@EnsureRequestContext()
	async handleCron() {
		await this.landingEditionService.queueDue();
	}
}
