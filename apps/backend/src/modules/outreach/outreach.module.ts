import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';

import { AuthModule } from '../auth/auth.module.js';
import { EmailModule } from '../email/email.module.js';
import { LLMModule } from '../llm/llm.module.js';
import { ReportsModule } from '../reports/reports.module.js';
import { VenuesModule } from '../venues/venues.module.js';

import { PitchHookAgent } from './agents/pitch-hook.agent.js';
import { AdminOutreachController } from './controllers/admin.outreach.controller.js';
import { OutreachTouch } from './entities/outreach-touch.entity.js';
import { Prospect } from './entities/prospect.entity.js';
import { OutreachService } from './services/outreach.service.js';
import { PitchHookService } from './services/pitch-hook.service.js';
import { ProspectQueryService } from './services/prospect-query.service.js';
import { ReportDeliveryService } from './services/report-delivery.service.js';
import { ReviewAlertService } from './services/review-alert.service.js';
import { ReportBuiltWorker } from './workers/report-built.worker.js';
import { ReviewAlertWorker } from './workers/review-alert.worker.js';

@Module({
	imports: [
		MikroOrmModule.forFeature([Prospect, OutreachTouch, User, UserSession]),
		AuthModule,
		EmailModule,
		LLMModule,
		ReportsModule,
		VenuesModule,
	],
	controllers: [AdminOutreachController],
	providers: [
		OutreachService,
		ProspectQueryService,
		ReportDeliveryService,
		ReportBuiltWorker,
		ReviewAlertService,
		ReviewAlertWorker,
		PitchHookService,
		PitchHookAgent,
	],
	exports: [OutreachService, ProspectQueryService],
})
export class OutreachModule {}
