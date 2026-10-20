import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';

import { ApifyModule } from '../apify/apify.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CitiesModule } from '../cities/cities.module.js';
import { FoodTopicsModule } from '../food-topics/food-topics.module.js';
import { LLMModule } from '../llm/llm.module.js';
import { VenuesModule } from '../venues/venues.module.js';

import { CommentIntentAgent } from './agents/comment-intent.agent.js';
import { MentionExtractionAgent } from './agents/mention-extraction.agent.js';
import { VenueMatchAgent } from './agents/venue-match.agent.js';
import { AdminAccountsController } from './controllers/admin.accounts.controller.js';
import { AdminBrandAccountsController } from './controllers/admin.brand-accounts.controller.js';
import { AdminCreatorsController } from './controllers/admin.creators.controller.js';
import { AdminPostCommentsController } from './controllers/admin.post-comments.controller.js';
import { AdminSocialController } from './controllers/admin.social.controller.js';
import { Creator } from './entities/creator.entity.js';
import { Mention } from './entities/mention.entity.js';
import { PostComment } from './entities/post-comment.entity.js';
import { SocialAccount } from './entities/social-account.entity.js';
import { SocialAccountSnapshot } from './entities/social-account-snapshot.entity.js';
import { SocialPost } from './entities/social-post.entity.js';
import { AccountMatchingService } from './services/account-matching.service.js';
import { BrandPostsService } from './services/brand-posts.service.js';
import { CreatorService } from './services/creator.service.js';
import { MentionExtractionService } from './services/mention-extraction.service.js';
import { MentionMatchingService } from './services/mention-matching.service.js';
import { OwnAccountService } from './services/own-account.service.js';
import { PostCommentService } from './services/post-comment.service.js';
import { SocialAccountService } from './services/social-account.service.js';
import { SocialPostService } from './services/social-post.service.js';
import { SocialScrapeService } from './services/social-scrape.service.js';
import { BrandChangedWorker } from './workers/brand-changed.worker.js';

@Module({
	imports: [
		MikroOrmModule.forFeature([SocialPost, SocialAccount, SocialAccountSnapshot, Creator, Mention, PostComment, User, UserSession]),
		ApifyModule,
		AuthModule,
		CitiesModule,
		FoodTopicsModule,
		LLMModule,
		VenuesModule,
	],
	controllers: [
		AdminSocialController,
		AdminPostCommentsController,
		AdminAccountsController,
		AdminBrandAccountsController,
		AdminCreatorsController,
	],
	providers: [
		SocialPostService,
		SocialAccountService,
		OwnAccountService,
		AccountMatchingService,
		CreatorService,
		SocialScrapeService,
		MentionExtractionService,
		MentionMatchingService,
		BrandPostsService,
		PostCommentService,
		MentionExtractionAgent,
		CommentIntentAgent,
		VenueMatchAgent,
		BrandChangedWorker,
	],
	exports: [
		SocialScrapeService,
		SocialAccountService,
		OwnAccountService,
		AccountMatchingService,
		PostCommentService,
		MentionExtractionService,
		MentionMatchingService,
		BrandPostsService,
		MikroOrmModule,
	],
})
export class SocialModule {}
