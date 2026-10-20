import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { ApifyRun } from './entities/apify-run.entity.js';
import { ApifyService } from './services/apify.service.js';
import { SettleApifyRunCostWorker } from './workers/settle-apify-run-cost.worker.js';

@Module({
	imports: [MikroOrmModule.forFeature([ApifyRun])],
	providers: [ApifyService, SettleApifyRunCostWorker],
	exports: [ApifyService, MikroOrmModule],
})
export class ApifyModule {}
