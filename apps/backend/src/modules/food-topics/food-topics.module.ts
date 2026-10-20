import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';

import { AuthModule } from '../auth/auth.module.js';

import { AdminFoodTopicsController } from './controllers/admin.food-topics.controller.js';
import { AdminVenueFoodTopicsController } from './controllers/admin.venue-food-topics.controller.js';
import { FoodTopic } from './entities/food-topic.entity.js';
import { FoodTopicIgnoredWord } from './entities/food-topic-ignored-word.entity.js';
import { VenueFoodTopic } from './entities/venue-food-topic.entity.js';
import { FoodTopicService } from './services/food-topic.service.js';
import { TrendsTopicLookupService } from './services/trends-topic-lookup.service.js';
import { VenueFoodTopicService } from './services/venue-food-topic.service.js';

/** The food topic taxonomy every kind-of-food reader resolves raw cuisines with. */
@Module({
	imports: [
		MikroOrmModule.forFeature([
			FoodTopic,
			FoodTopicIgnoredWord,
			VenueFoodTopic,
			User,
			UserSession,
		]),
		AuthModule,
	],
	controllers: [AdminFoodTopicsController, AdminVenueFoodTopicsController],
	providers: [FoodTopicService, TrendsTopicLookupService, VenueFoodTopicService],
	exports: [FoodTopicService, VenueFoodTopicService],
})
export class FoodTopicsModule {}
