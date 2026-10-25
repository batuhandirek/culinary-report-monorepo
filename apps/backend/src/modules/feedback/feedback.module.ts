import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';

import { AuthModule } from '../auth/auth.module.js';
import { BacklogModule } from '../backlog/backlog.module.js';
import { FoodTopicsModule } from '../food-topics/food-topics.module.js';
import { LLMModule } from '../llm/llm.module.js';

import { DishTopicAgent } from './agents/dish-topic.agent.js';
import { FeedbackAmountAgent } from './agents/feedback-amount.agent.js';
import { FeedbackDishAgent } from './agents/feedback-dish.agent.js';
import { FeedbackThemeAgent } from './agents/feedback-theme.agent.js';
import { AdminDishNamesController } from './controllers/admin.dish-names.controller.js';
import { AdminFeedbackController } from './controllers/admin.feedback.controller.js';
import { DishName } from './entities/dish-name.entity.js';
import { FeedbackPoint } from './entities/feedback-point.entity.js';
import { DishNameService } from './services/dish-name.service.js';
import { FeedbackService } from './services/feedback.service.js';
import { FeedbackAmountService } from './services/feedback-amount.service.js';
import { FeedbackDishService } from './services/feedback-dish.service.js';
import { FeedbackThemeService } from './services/feedback-theme.service.js';

/**
 * What posts and reviews say, as rows (`FeedbackPoint`), the dish names they carry (`DishName`),
 * and the LLM passes over them. Imports no module whose entities it points at (venues, social):
 * entity references need none, and both import this one to write their sources' rows.
 */
@Module({
	imports: [
		MikroOrmModule.forFeature([FeedbackPoint, DishName, User, UserSession]),
		AuthModule,
		BacklogModule,
		FoodTopicsModule,
		LLMModule,
	],
	controllers: [AdminFeedbackController, AdminDishNamesController],
	providers: [
		FeedbackService,
		DishNameService,
		FeedbackThemeService,
		FeedbackDishService,
		FeedbackAmountService,
		FeedbackThemeAgent,
		FeedbackDishAgent,
		FeedbackAmountAgent,
		DishTopicAgent,
	],
	exports: [FeedbackService],
})
export class FeedbackModule {}
