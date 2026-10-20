import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { OnCron } from 'src/modules/pgboss/decorators/on-cron.decorator.js';

import { CityDayService } from '../services/city-day.service.js';

// Every day at 05:00 UTC, when yesterday is over in every European city
export const CITY_DAY_CRON = '0 5 * * *';

/** Yesterday's weather and holidays for every active city (free sources, no Apify). */
@Injectable()
export class CityDayCron {
	constructor(
		private readonly orm: MikroORM,
		private readonly cityDayService: CityDayService,
	) {}

	@OnCron('city-days', CITY_DAY_CRON)
	@EnsureRequestContext()
	async handleCron() {
		await this.cityDayService.fillRecent();
	}
}
