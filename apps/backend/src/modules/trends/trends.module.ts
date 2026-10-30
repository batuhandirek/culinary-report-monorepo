import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';

import { ApifyModule } from '../apify/apify.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { TopicsModule } from '../topics/topics.module.js';

import { AdminSearchInterestController } from './controllers/admin.search-interest.controller.js';
import { AdminThemeInsightsController } from './controllers/admin.theme-insights.controller.js';
import { AdminTopicInsightsController } from './controllers/admin.topic-insights.controller.js';
import { AdminTrendsController } from './controllers/admin.trends.controller.js';
import { TrendRelatedQuery } from './entities/trend-related-query.entity.js';
import { TrendSearchInterest } from './entities/trend-search-interest.entity.js';
import { SearchInterestService } from './services/search-interest.service.js';
import { ThemeInsightService } from './services/theme-insight.service.js';
import { TopicInsightService } from './services/topic-insight.service.js';
import { TrendService } from './services/trend.service.js';

/** City-level trends over mentions and reviews. Reports import it for their city section. */
@Module({
	imports: [MikroOrmModule.forFeature([TrendSearchInterest, TrendRelatedQuery, User, UserSession]), AuthModule, ApifyModule, TopicsModule],
	controllers: [AdminTrendsController, AdminSearchInterestController, AdminTopicInsightsController, AdminThemeInsightsController],
	providers: [TrendService, SearchInterestService, TopicInsightService, ThemeInsightService],
	// ThemeInsightService: the report analysis reads the city's complaint themes
	exports: [TrendService, SearchInterestService, ThemeInsightService],
})
export class TrendsModule {}
