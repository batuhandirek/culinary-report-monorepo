import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';

import { AuthModule } from '../auth/auth.module.js';
import { CitiesModule } from '../cities/cities.module.js';
import { FeedbackModule } from '../feedback/feedback.module.js';
import { TopicsModule } from '../topics/topics.module.js';
import { OutreachModule } from '../outreach/outreach.module.js';
import { VenuesModule } from '../venues/venues.module.js';

import { AdminBrandListController } from './controllers/admin.brand-list.controller.js';
import { AdminDataCoverageController } from './controllers/admin.data-coverage.controller.js';
import { AdminOverviewController } from './controllers/admin.overview.controller.js';
import { BrandListService } from './services/brand-list.service.js';
import { BrandSummaryService } from './services/brand-summary.service.js';
import { DataCoverageService } from './services/data-coverage.service.js';
import { OverviewService } from './services/overview.service.js';
import { TodayService } from './services/today.service.js';

/**
 * The admin's read model across modules: `/admin`'s figures (the pipeline, the spend, the reports
 * and the sales list), the Brands page and the brand page's Overview, and `/admin/data`'s
 * month coverage. Reads other modules' tables; writes nothing.
 */
@Module({
	imports: [
		MikroOrmModule.forFeature([User, UserSession]),
		AuthModule,
		CitiesModule,
		FeedbackModule,
		TopicsModule,
		OutreachModule,
		VenuesModule,
	],
	controllers: [AdminOverviewController, AdminBrandListController, AdminDataCoverageController],
	providers: [OverviewService, TodayService, BrandListService, BrandSummaryService, DataCoverageService],
})
export class OverviewModule {}
