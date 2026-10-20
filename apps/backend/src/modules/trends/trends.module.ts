import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';

import { ApifyModule } from '../apify/apify.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { FoodTopicsModule } from '../food-topics/food-topics.module.js';

import { AdminSearchInterestController } from './controllers/admin.search-interest.controller.js';
import { AdminTopicInsightsController } from './controllers/admin.topic-insights.controller.js';
import { AdminTrendsController } from './controllers/admin.trends.controller.js';
import { TrendRelatedQuery } from './entities/trend-related-query.entity.js';
import { TrendSearchInterest } from './entities/trend-search-interest.entity.js';
import { SearchInterestService } from './services/search-interest.service.js';
import { TopicInsightService } from './services/topic-insight.service.js';
import { TrendService } from './services/trend.service.js';

/** City-level trends over mentions and reviews. Reports import it for their city section. */
@Module({
	imports: [MikroOrmModule.forFeature([TrendSearchInterest, TrendRelatedQuery, User, UserSession]), AuthModule, ApifyModule, FoodTopicsModule],
	controllers: [AdminTrendsController, AdminSearchInterestController, AdminTopicInsightsController],
	providers: [TrendService, SearchInterestService, TopicInsightService],
	exports: [TrendService, SearchInterestService],
})
export class TrendsModule {}
