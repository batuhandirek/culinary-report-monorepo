import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';

import { ApifyModule } from '../apify/apify.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CitiesModule } from '../cities/cities.module.js';
import { OutreachModule } from '../outreach/outreach.module.js';
import { ReportsModule } from '../reports/reports.module.js';
import { SocialModule } from '../social/social.module.js';
import { TrendsModule } from '../trends/trends.module.js';
import { VenuesModule } from '../venues/venues.module.js';

import { AdminPipelineController } from './controllers/admin.pipeline.controller.js';
import { DemandSampleCron } from './crons/demand-sample.cron.js';
import { InstagramRecentCron } from './crons/instagram-recent.cron.js';
import { MonthlyPipelineCron } from './crons/monthly-pipeline.cron.js';
import { ReviewWatchCron } from './crons/review-watch.cron.js';
import { WeeklyListeningCron } from './crons/weekly-listening.cron.js';
import { PipelineRun } from './entities/pipeline-run.entity.js';
import { PipelineService } from './services/pipeline.service.js';
import { PipelineRecoveryService } from './services/pipeline-recovery.service.js';
import { RunPipelineWorker } from './workers/run-pipeline.worker.js';

@Module({
	imports: [
		MikroOrmModule.forFeature([PipelineRun, User, UserSession]),
		ApifyModule,
		AuthModule,
		CitiesModule,
		VenuesModule,
		SocialModule,
		ReportsModule,
		OutreachModule,
		TrendsModule,
	],
	controllers: [AdminPipelineController],
	providers: [
		PipelineService,
		PipelineRecoveryService,
		RunPipelineWorker,
		MonthlyPipelineCron,
		DemandSampleCron,
		ReviewWatchCron,
		InstagramRecentCron,
		WeeklyListeningCron,
	],
})
export class PipelineModule {}
