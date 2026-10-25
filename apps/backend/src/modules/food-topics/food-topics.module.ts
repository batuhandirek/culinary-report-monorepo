import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';

import { AuthModule } from '../auth/auth.module.js';

import { AdminFoodTopicsController } from './controllers/admin.food-topics.controller.js';
import { AdminVenueFoodTopicsController } from './controllers/admin.venue-food-topics.controller.js';
import { FoodTopic } from './entities/food-topic.entity.js';
import { FoodTopicIgnoredWord } from './entities/food-topic-ignored-word.entity.js';
import { MentionFoodTopic } from './entities/mention-food-topic.entity.js';
import { MenuItemFoodTopic } from './entities/menu-item-food-topic.entity.js';
import { VenueFoodTopic } from './entities/venue-food-topic.entity.js';
import { FoodTopicService } from './services/food-topic.service.js';
import { FoodTopicRelinkService } from './services/food-topic-relink.service.js';
import { MentionFoodTopicService } from './services/mention-food-topic.service.js';
import { MenuTopicService } from './services/menu-topic.service.js';
import { TrendsTopicLookupService } from './services/trends-topic-lookup.service.js';
import { VenueFoodTopicService } from './services/venue-food-topic.service.js';
import { FoodTopicCityRefreshWorker } from './workers/food-topic-city-refresh.worker.js';
import { FoodTopicRelinkWorker } from './workers/food-topic-relink.worker.js';

/** The food topic taxonomy every kind-of-food reader resolves raw cuisines with. */
@Module({
	imports: [
		MikroOrmModule.forFeature([
			FoodTopic,
			FoodTopicIgnoredWord,
			VenueFoodTopic,
			MentionFoodTopic,
			MenuItemFoodTopic,
			User,
			UserSession,
		]),
		AuthModule,
	],
	controllers: [AdminFoodTopicsController, AdminVenueFoodTopicsController],
	providers: [
		FoodTopicService,
		FoodTopicRelinkService,
		FoodTopicRelinkWorker,
		FoodTopicCityRefreshWorker,
		MentionFoodTopicService,
		MenuTopicService,
		TrendsTopicLookupService,
		VenueFoodTopicService,
	],
	exports: [FoodTopicService, FoodTopicRelinkService, MentionFoodTopicService, MenuTopicService, VenueFoodTopicService],
})
export class FoodTopicsModule {}
