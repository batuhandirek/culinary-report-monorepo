import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';

import { AuthModule } from '../auth/auth.module.js';
import { CitiesModule } from '../cities/cities.module.js';
import { FoodTopicsModule } from '../food-topics/food-topics.module.js';
import { LLMModule } from '../llm/llm.module.js';
import { SocialModule } from '../social/social.module.js';
import { TrendsModule } from '../trends/trends.module.js';
import { VenuesModule } from '../venues/venues.module.js';

import { ReportHighlightsAgent } from './agents/report-highlights.agent.js';
import { ReviewReplyAgent } from './agents/review-reply.agent.js';
import { AdminReportSharesController } from './controllers/admin.report-shares.controller.js';
import { AdminReportsController } from './controllers/admin.reports.controller.js';
import { SharedReportsController } from './controllers/shared-reports.controller.js';
import { Report } from './entities/report.entity.js';
import { ReportShare } from './entities/report-share.entity.js';
import { ReportService } from './services/report.service.js';
import { ReportCityService } from './services/report-city.service.js';
import { ReportPdfService } from './services/report-pdf.service.js';
import { ReportReachService } from './services/report-reach.service.js';
import { ReportShareService } from './services/report-share.service.js';
import { ReportSignalsService } from './services/report-signals.service.js';

@Module({
	imports: [
		MikroOrmModule.forFeature([Report, ReportShare, User, UserSession]),
		AuthModule,
		CitiesModule,
		FoodTopicsModule,
		LLMModule,
		VenuesModule,
		SocialModule,
		TrendsModule,
	],
	controllers: [AdminReportsController, AdminReportSharesController, SharedReportsController],
	providers: [
		ReportService,
		ReportReachService,
		ReportCityService,
		ReportSignalsService,
		ReportPdfService,
		ReportShareService,
		ReportHighlightsAgent,
		ReviewReplyAgent,
	],
	// The agent too: outreach's review alert drafts its reply with it
	exports: [ReportService, ReportShareService, ReportPdfService, ReviewReplyAgent],
})
export class ReportsModule {}
