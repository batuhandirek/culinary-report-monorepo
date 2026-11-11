import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';

import { ApifyModule } from '../apify/apify.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { BacklogModule } from '../backlog/backlog.module.js';
import { CitiesModule } from '../cities/cities.module.js';
import { LLMModule } from '../llm/llm.module.js';
import { OutreachModule } from '../outreach/outreach.module.js';
import { SocialModule } from '../social/social.module.js';
import { StatementsModule } from '../statements/statements.module.js';
import { TopicsModule } from '../topics/topics.module.js';
import { TrendsModule } from '../trends/trends.module.js';
import { VenuesModule } from '../venues/venues.module.js';

import { AccountFollowersSchedule } from './account-followers/schedules/account-followers.schedule.js';
import { AccountFollowersWorkflow } from './account-followers/workflows/account-followers.workflow.js';
import { InstagramHashtagsWorkflow } from './atoms/instagram-hashtags/workflows/instagram-hashtags.workflow.js';
import { InstagramProfilesWorkflow } from './atoms/instagram-profiles/workflows/instagram-profiles.workflow.js';
import { PlacesWorkflow } from './atoms/places/workflows/places.workflow.js';
import { ReviewsWorkflow } from './atoms/reviews/workflows/reviews.workflow.js';
import { TiktokProfilesWorkflow } from './atoms/tiktok-profiles/workflows/tiktok-profiles.workflow.js';
import { TiktokSearchWorkflow } from './atoms/tiktok-search/workflows/tiktok-search.workflow.js';
import { AdminBackfillReviewsController } from './backfill-reviews/controllers/admin.backfill-reviews.controller.js';
import { BackfillReviewsWorkflow } from './backfill-reviews/workflows/backfill-reviews.workflow.js';
import { AdminBrandBranchSearchController } from './brand-branch-search/controllers/admin.brand-branch-search.controller.js';
import { AdminRefreshVenueDetailsController } from './refresh-venue-details/controllers/admin.refresh-venue-details.controller.js';
import { BrandBranchSearchWorkflow } from './brand-branch-search/workflows/brand-branch-search.workflow.js';
import { PressClassificationAgent } from './classify-press/agents/press-classification.agent.js';
import { ClassifyPressSchedule } from './classify-press/schedules/classify-press.schedule.js';
import { ClassifyPressWorkflow } from './classify-press/workflows/classify-press.workflow.js';
import { AdminCreatorWatchController } from './creator-watch/controllers/admin.creator-watch.controller.js';
import { CreatorWatchSchedule } from './creator-watch/schedules/creator-watch.schedule.js';
import { CreatorWatchWorkflow } from './creator-watch/workflows/creator-watch.workflow.js';
import { DemandSampleSchedule } from './demand-sample/schedules/demand-sample.schedule.js';
import { DemandSampleWorkflow } from './demand-sample/workflows/demand-sample.workflow.js';
import { DishSearchesSchedule } from './dish-searches/schedules/dish-searches.schedule.js';
import { DishSearchesWorkflow } from './dish-searches/workflows/dish-searches.workflow.js';
import { FillCompetitorsSchedule } from './fill-competitors/schedules/fill-competitors.schedule.js';
import { FillCompetitorsWorkflow } from './fill-competitors/workflows/fill-competitors.workflow.js';
import { FindOwnAccountsSchedule } from './find-own-accounts/schedules/find-own-accounts.schedule.js';
import { FindOwnAccountsWorkflow } from './find-own-accounts/workflows/find-own-accounts.workflow.js';
import { LookupVenuesSchedule } from './lookup-venues/schedules/lookup-venues.schedule.js';
import { LookupVenuesWorkflow } from './lookup-venues/workflows/lookup-venues.workflow.js';
import { LookupVenuesWeekWorkflow } from './lookup-venues/workflows/lookup-venues-week.workflow.js';
import { VenueMatchAgent } from './match-mentions/agents/venue-match.agent.js';
import { MatchMentionsSchedule } from './match-mentions/schedules/match-mentions.schedule.js';
import { MatchMentionsWorkflow } from './match-mentions/workflows/match-mentions.workflow.js';
import { OsmPlacesSchedule } from './osm-places/schedules/osm-places.schedule.js';
import { OsmPlacesWorkflow } from './osm-places/workflows/osm-places.workflow.js';
import { PostCountsSchedule } from './post-counts/schedules/post-counts.schedule.js';
import { PostCountsWorkflow } from './post-counts/workflows/post-counts.workflow.js';
import { ProfileTrackSchedule } from './profile-track/schedules/profile-track.schedule.js';
import { ProfileTrackWorkflow } from './profile-track/workflows/profile-track.workflow.js';
import { RatingSnapshotSchedule } from './rating-snapshot/schedules/rating-snapshot.schedule.js';
import { RatingSnapshotWorkflow } from './rating-snapshot/workflows/rating-snapshot.workflow.js';
import { CommentDisagreementAgent } from './read-comments/agents/comment-disagreement.agent.js';
import { CommentIntentAgent } from './read-comments/agents/comment-intent.agent.js';
import { ReadCommentsSchedule } from './read-comments/schedules/read-comments.schedule.js';
import { ReadCommentsWorkflow } from './read-comments/workflows/read-comments.workflow.js';
import { ReadMentionedProfilesSchedule } from './read-mentioned-profiles/schedules/read-mentioned-profiles.schedule.js';
import { ReadMentionedProfilesWorkflow } from './read-mentioned-profiles/workflows/read-mentioned-profiles.workflow.js';
import { PostClaimsAgent } from './read-posts/agents/post-claims.agent.js';
import { PostGateAgent } from './read-posts/agents/post-gate.agent.js';
import { ReadPostsSchedule } from './read-posts/schedules/read-posts.schedule.js';
import { ReadPostsWorkflow } from './read-posts/workflows/read-posts.workflow.js';
import { ReviewClaimsAgent } from './read-reviews/agents/review-claims.agent.js';
import { ReadReviewsSchedule } from './read-reviews/schedules/read-reviews.schedule.js';
import { ReadReviewsWorkflow } from './read-reviews/workflows/read-reviews.workflow.js';
import { AdminReflagOpeningsController } from './reflag-openings/controllers/admin.reflag-openings.controller.js';
import { ReflagOpeningsWorkflow } from './reflag-openings/workflows/reflag-openings.workflow.js';
import { RefreshVenueDetailsSchedule } from './refresh-venue-details/schedules/refresh-venue-details.schedule.js';
import { RefreshVenueDetailsWorkflow } from './refresh-venue-details/workflows/refresh-venue-details.workflow.js';
import { AdminRereadPostsController } from './reread-posts/controllers/admin.reread-posts.controller.js';
import { RereadPostsSchedule } from './reread-posts/schedules/reread-posts.schedule.js';
import { RereadPostsWorkflow } from './reread-posts/workflows/reread-posts.workflow.js';
import { RereadReviewsBacklogService } from './reread-reviews/services/reread-reviews-backlog.service.js';
import { ReviewWatchSchedule } from './review-watch/schedules/review-watch.schedule.js';
import { ReviewWatchWorkflow } from './review-watch/workflows/review-watch.workflow.js';
import { ScoreLeadsSchedule } from './score-leads/schedules/score-leads.schedule.js';
import { ScoreLeadsWorkflow } from './score-leads/workflows/score-leads.workflow.js';
import { ScrapeAccountsSchedule } from './scrape-accounts/schedules/scrape-accounts.schedule.js';
import { ScrapeAccountsWorkflow } from './scrape-accounts/workflows/scrape-accounts.workflow.js';
import { ScrapeBlogsSchedule } from './scrape-blogs/schedules/scrape-blogs.schedule.js';
import { ScrapeBlogsWorkflow } from './scrape-blogs/workflows/scrape-blogs.workflow.js';
import { ScrapeCommentsSchedule } from './scrape-comments/schedules/scrape-comments.schedule.js';
import { ScrapeCommentsWorkflow } from './scrape-comments/workflows/scrape-comments.workflow.js';
import { ScrapeDeliverySchedule } from './scrape-delivery/schedules/scrape-delivery.schedule.js';
import { ScrapeDeliveryWorkflow } from './scrape-delivery/workflows/scrape-delivery.workflow.js';
import { ScrapeInstagramSchedule } from './scrape-instagram/schedules/scrape-instagram.schedule.js';
import { ScrapeInstagramWorkflow } from './scrape-instagram/workflows/scrape-instagram.workflow.js';
import { ScrapePressSchedule } from './scrape-press/schedules/scrape-press.schedule.js';
import { ScrapePressWorkflow } from './scrape-press/workflows/scrape-press.workflow.js';
import { ScrapeReviewsSchedule } from './scrape-reviews/schedules/scrape-reviews.schedule.js';
import { ScrapeReviewsWorkflow } from './scrape-reviews/workflows/scrape-reviews.workflow.js';
import { ScrapeTiktokSchedule } from './scrape-tiktok/schedules/scrape-tiktok.schedule.js';
import { ScrapeTiktokWorkflow } from './scrape-tiktok/workflows/scrape-tiktok.workflow.js';
import { ScrapeVenueSocialSchedule } from './scrape-venue-social/schedules/scrape-venue-social.schedule.js';
import { ScrapeVenueSocialWorkflow } from './scrape-venue-social/workflows/scrape-venue-social.workflow.js';
import { ScrapeVenuesSchedule } from './scrape-venues/schedules/scrape-venues.schedule.js';
import { ScrapeVenuesWorkflow } from './scrape-venues/workflows/scrape-venues.workflow.js';
import { SearchInterestSchedule } from './search-interest/schedules/search-interest.schedule.js';
import { SearchInterestWorkflow } from './search-interest/workflows/search-interest.workflow.js';
import { ReportBrandsService } from './shared/services/report-brands.service.js';

/**
 * The pipeline: every operation the city's data goes through (scrapes, reading, matching, the
 * report brands' place figures), each a folder of its own with its workflow per cadence, its
 * schedule and its queue, and the agents of the reading. It holds no entity and no query: every
 * step is one call to the service of the module that owns the data. Nothing runs the operations
 * in order; an operation that needs another's work calls it (`runOperation`, one run per city and
 * period), so each governs itself. The atoms (`atoms/`: one typed provider call as a child
 * workflow with one save path) are what the operations compose.
 */
@Module({
	imports: [
		MikroOrmModule.forFeature([User, UserSession]),
		ApifyModule,
		AuthModule,
		BacklogModule,
		CitiesModule,
		LLMModule,
		OutreachModule,
		SocialModule,
		StatementsModule,
		TopicsModule,
		TrendsModule,
		VenuesModule,
	],
	controllers: [
		AdminBackfillReviewsController,
		AdminBrandBranchSearchController,
		AdminRefreshVenueDetailsController,
		AdminCreatorWatchController,
		AdminReflagOpeningsController,
		AdminRereadPostsController,
	],
	providers: [
		InstagramHashtagsWorkflow,
		PlacesWorkflow,
		InstagramProfilesWorkflow,
		ReviewsWorkflow,
		TiktokProfilesWorkflow,
		TiktokSearchWorkflow,
		AccountFollowersSchedule,
		AccountFollowersWorkflow,
		BackfillReviewsWorkflow,
		BrandBranchSearchWorkflow,
		PressClassificationAgent,
		ClassifyPressSchedule,
		ClassifyPressWorkflow,
		CreatorWatchSchedule,
		CreatorWatchWorkflow,
		DemandSampleSchedule,
		DemandSampleWorkflow,
		DishSearchesSchedule,
		DishSearchesWorkflow,
		FillCompetitorsSchedule,
		FillCompetitorsWorkflow,
		FindOwnAccountsSchedule,
		FindOwnAccountsWorkflow,
		LookupVenuesSchedule,
		LookupVenuesWeekWorkflow,
		LookupVenuesWorkflow,
		MatchMentionsSchedule,
		MatchMentionsWorkflow,
		VenueMatchAgent,
		OsmPlacesSchedule,
		OsmPlacesWorkflow,
		PostCountsSchedule,
		PostCountsWorkflow,
		ProfileTrackSchedule,
		ProfileTrackWorkflow,
		RatingSnapshotSchedule,
		RatingSnapshotWorkflow,
		CommentDisagreementAgent,
		CommentIntentAgent,
		ReadCommentsSchedule,
		ReadCommentsWorkflow,
		ReadMentionedProfilesSchedule,
		ReadMentionedProfilesWorkflow,
		PostClaimsAgent,
		PostGateAgent,
		ReadPostsSchedule,
		ReadPostsWorkflow,
		ReviewClaimsAgent,
		ReadReviewsSchedule,
		ReadReviewsWorkflow,
		ReflagOpeningsWorkflow,
		RefreshVenueDetailsSchedule,
		RefreshVenueDetailsWorkflow,
		RereadPostsSchedule,
		RereadPostsWorkflow,
		RereadReviewsBacklogService,
		ReviewWatchSchedule,
		ReviewWatchWorkflow,
		ScoreLeadsSchedule,
		ScoreLeadsWorkflow,
		ScrapeAccountsSchedule,
		ScrapeAccountsWorkflow,
		ScrapeBlogsSchedule,
		ScrapeBlogsWorkflow,
		ScrapeCommentsSchedule,
		ScrapeCommentsWorkflow,
		ScrapeDeliverySchedule,
		ScrapeDeliveryWorkflow,
		ScrapeInstagramSchedule,
		ScrapeInstagramWorkflow,
		ScrapePressSchedule,
		ScrapePressWorkflow,
		ScrapeReviewsSchedule,
		ScrapeReviewsWorkflow,
		ScrapeTiktokSchedule,
		ScrapeTiktokWorkflow,
		ScrapeVenueSocialSchedule,
		ScrapeVenueSocialWorkflow,
		ScrapeVenuesSchedule,
		ScrapeVenuesWorkflow,
		SearchInterestSchedule,
		SearchInterestWorkflow,
		ReportBrandsService,
	],
})
export class PipelineModule {}
