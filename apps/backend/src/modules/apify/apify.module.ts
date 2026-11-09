import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module, type OnModuleInit } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { User } from '../auth/entities/user.entity.js';
import { UserSession } from '../auth/entities/user-session.entity.js';

import { AdminApifyController } from './controllers/admin.apify.controller.js';
import { ApifyRun } from './entities/apify-run.entity.js';
import { ApifyCreditSchedule } from './schedules/apify-credit.schedule.js';
import { ApifyService } from './services/apify.service.js';
import { watchProcessShutdown } from './util/process-shutdown.js';
import { SettleApifyRunCostWorker } from './workers/settle-apify-run-cost.worker.js';
import { ApifyWorkflows } from './workflows/apify.workflow.js';

/**
 * Apify: the one way to run an actor (`ApifyService.runActor`, each run the `ApifyWorkflows.runActor`
 * workflow on the `apify` queue), every run recorded with its cost and items (`ApifyRun`), and the
 * account's credit read live (`ApifyService.credit`): a run short of it waits, woken by the credit
 * refresher (`ApifyCreditSchedule`) or the cycle's end.
 * `GET /admin/apify-runs` lists the runs, `GET /admin/apify-credit` the account.
 */
@Module({
	imports: [MikroOrmModule.forFeature([ApifyRun, User, UserSession]), AuthModule],
	controllers: [AdminApifyController],
	providers: [ApifyService, ApifyWorkflows, SettleApifyRunCostWorker, ApifyCreditSchedule],
	exports: [ApifyService, MikroOrmModule],
})
export class ApifyModule implements OnModuleInit {
	/** From a SIGTERM on, no new actor run starts: the next process resumes the workflows */
	onModuleInit() {
		watchProcessShutdown();
	}
}
