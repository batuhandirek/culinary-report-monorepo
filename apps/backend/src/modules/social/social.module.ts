import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';

import { ApifyModule } from '../apify/apify.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { BacklogModule } from '../backlog/backlog.module.js';
import { CitiesModule } from '../cities/cities.module.js';
import { LLMModule } from '../llm/llm.module.js';
import { StatementsModule } from '../statements/statements.module.js';
import { TopicsModule } from '../topics/topics.module.js';
import { VenuesModule } from '../venues/venues.module.js';

import { ProfilePlaceAgent } from './agents/profile-place.agent.js';
import { AdminAccountsController } from './controllers/admin.accounts.controller.js';
import { AdminBrandAccountsController } from './controllers/admin.brand-accounts.controller.js';
import { AdminCreatorsController } from './controllers/admin.creators.controller.js';
import { AdminHashtagsController } from './controllers/admin.hashtags.controller.js';
import { AdminPostCommentsController } from './controllers/admin.post-comments.controller.js';
import { AdminSocialController } from './controllers/admin.social.controller.js';
import { Creator } from './entities/creator.entity.js';
import { Hashtag } from './entities/hashtag.entity.js';
import { Mention } from './entities/mention.entity.js';
import { PostComment } from './entities/post-comment.entity.js';
import { PostHashtag } from './entities/post-hashtag.entity.js';
import { PostSource } from './entities/post-source.entity.js';
import { SocialAccount } from './entities/social-account.entity.js';
import { SocialAccountSnapshot } from './entities/social-account-snapshot.entity.js';
import { SocialPost } from './entities/social-post.entity.js';
import { AccountMatchingService } from './services/account-matching.service.js';
import { AccountScrapeService } from './services/account-scrape.service.js';
import { AccountTwinService } from './services/account-twin.service.js';
import { AccountWatchService } from './services/account-watch.service.js';
import { BlogFetchService } from './services/blog-fetch.service.js';
import { BlogScrapeService } from './services/blog-scrape.service.js';
import { BrandPostsService } from './services/brand-posts.service.js';
import { CreatorService } from './services/creator.service.js';
import { HashtagService } from './services/hashtag.service.js';
import { MentionExtractionService } from './services/mention-extraction.service.js';
import { MentionMatchingService } from './services/mention-matching.service.js';
import { OwnAccountService } from './services/own-account.service.js';
import { PostCommentService } from './services/post-comment.service.js';
import { PostCountsService } from './services/post-counts.service.js';
import { PostDigestionService } from './services/post-digestion.service.js';
import { ProfilePlaceService } from './services/profile-place.service.js';
import { SocialAccountService } from './services/social-account.service.js';
import { SocialPostService } from './services/social-post.service.js';
import { SocialScrapeService } from './services/social-scrape.service.js';
import { BrandChangedWorker } from './workers/brand-changed.worker.js';

@Module({
	imports: [
		MikroOrmModule.forFeature([
			SocialPost,
			SocialAccount,
			SocialAccountSnapshot,
			Creator,
			Mention,
			PostComment,
			Hashtag,
			PostHashtag,
			PostSource,
			User,
			UserSession,
		]),
		ApifyModule,
		AuthModule,
		StatementsModule,
		BacklogModule,
		CitiesModule,
		TopicsModule,
		LLMModule,
		VenuesModule,
	],
	controllers: [
		AdminSocialController,
		AdminHashtagsController,
		AdminPostCommentsController,
		AdminAccountsController,
		AdminBrandAccountsController,
		AdminCreatorsController,
	],
	providers: [
		SocialPostService,
		PostCountsService,
		PostDigestionService,
		HashtagService,
		BlogFetchService,
		BlogScrapeService,
		SocialAccountService,
		OwnAccountService,
		AccountScrapeService,
		AccountMatchingService,
		AccountTwinService,
		AccountWatchService,
		ProfilePlaceService,
		CreatorService,
		SocialScrapeService,
		MentionExtractionService,
		MentionMatchingService,
		BrandPostsService,
		PostCommentService,
		ProfilePlaceAgent,
		BrandChangedWorker,
	],
	exports: [
		SocialScrapeService,
		PostCountsService,
		PostDigestionService,
		BlogScrapeService,
		SocialAccountService,
		OwnAccountService,
		AccountScrapeService,
		AccountMatchingService,
		AccountTwinService,
		AccountWatchService,
		ProfilePlaceService,
		PostCommentService,
		MentionExtractionService,
		MentionMatchingService,
		BrandPostsService,
		MikroOrmModule,
	],
})
export class SocialModule {}
