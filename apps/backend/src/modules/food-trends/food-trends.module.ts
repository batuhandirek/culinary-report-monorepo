import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';

import { ApifyModule } from '../apify/apify.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CitiesModule } from '../cities/cities.module.js';
import { TopicsModule } from '../topics/topics.module.js';
import { TrendsModule } from '../trends/trends.module.js';
import { VenuesModule } from '../venues/venues.module.js';

import { AdminFoodTrendsController } from './controllers/admin.food-trends.controller.js';
import { FoodTrendsController } from './controllers/food-trends.controller.js';
import { FoodTrendsReport } from './entities/food-trends-report.entity.js';
import { FoodTrendsReportService } from './services/food-trends-report.service.js';
import { FoodTrendsSearchPullWorker } from './workers/food-trends-search-pull.worker.js';

/**
 * A city's quarter of food trends in public (`/<city>/trends/<YYYY>-q<N>`): searches on one scale
 * across kinds of food, Google's rising queries, the kinds of food posts named, openings by kind of
 * food. Reads cities, food topics, trends and venues; none of them import it.
 */
@Module({
	imports: [
		MikroOrmModule.forFeature([FoodTrendsReport, User, UserSession]),
		AuthModule,
		ApifyModule,
		CitiesModule,
		TopicsModule,
		TrendsModule,
		VenuesModule,
	],
	controllers: [FoodTrendsController, AdminFoodTrendsController],
	providers: [FoodTrendsReportService, FoodTrendsSearchPullWorker],
})
export class FoodTrendsModule {}
