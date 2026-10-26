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

import { ReportAnalysisAgent } from './agents/report-analysis.agent.js';
import { ReportHighlightsAgent } from './agents/report-highlights.agent.js';
import { ReviewReplyAgent } from './agents/review-reply.agent.js';
import { AdminReportSharesController } from './controllers/admin.report-shares.controller.js';
import { AdminReportConfigsController } from './controllers/admin.report-configs.controller.js';
import { AdminReportTemplatesController } from './controllers/admin.report-templates.controller.js';
import { AdminReportsController } from './controllers/admin.reports.controller.js';
import { SharedReportsController } from './controllers/shared-reports.controller.js';
import { Report } from './entities/report.entity.js';
import { ReportShare } from './entities/report-share.entity.js';
import { BrandReportConfig } from './entities/brand-report-config.entity.js';
import { ReportTemplate } from './entities/report-template.entity.js';
import { ReportService } from './services/report.service.js';
import { ReportCityService } from './services/report-city.service.js';
import { ReportEvidenceService } from './services/report-evidence.service.js';
import { ReportPdfService } from './services/report-pdf.service.js';
import { ReportReachService } from './services/report-reach.service.js';
import { ReportShareService } from './services/report-share.service.js';
import { ReportSignalsService } from './services/report-signals.service.js';
import { ReportConfigService } from './services/report-config.service.js';
import { ReportTemplateService } from './services/report-template.service.js';

@Module({
	imports: [
		MikroOrmModule.forFeature([Report, ReportShare, ReportTemplate, BrandReportConfig, User, UserSession]),
		AuthModule,
		CitiesModule,
		FoodTopicsModule,
		LLMModule,
		VenuesModule,
		SocialModule,
		TrendsModule,
	],
	controllers: [AdminReportsController, AdminReportSharesController, AdminReportTemplatesController, AdminReportConfigsController, SharedReportsController],
	providers: [
		ReportService,
		ReportReachService,
		ReportCityService,
		ReportSignalsService,
		ReportPdfService,
		ReportShareService,
		ReportTemplateService,
		ReportConfigService,
		ReportHighlightsAgent,
		ReviewReplyAgent,
		ReportAnalysisAgent,
		ReportEvidenceService,
	],
	// The agent too: outreach's review alert drafts its reply with it
	exports: [ReportService, ReportShareService, ReportPdfService, ReviewReplyAgent],
})
export class ReportsModule {}
