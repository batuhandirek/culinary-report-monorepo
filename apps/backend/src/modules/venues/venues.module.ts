import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';

import { ApifyModule } from '../apify/apify.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CitiesModule } from '../cities/cities.module.js';
import { FoodTopicsModule } from '../food-topics/food-topics.module.js';
import { ImagesModule } from '../image/images.module.js';
import { LLMModule } from '../llm/llm.module.js';

import { PressClassificationAgent } from './agents/press-classification.agent.js';
import { ReviewAnalysisAgent } from './agents/review-analysis.agent.js';
import { AdminBrandsController } from './controllers/admin.brands.controller.js';
import { AdminReviewsController } from './controllers/admin.reviews.controller.js';
import { AdminVenueSearchRanksController } from './controllers/admin.venue-search-ranks.controller.js';
import { AdminVenueStatusChangesController } from './controllers/admin.venue-status-changes.controller.js';
import { AdminVenuesController } from './controllers/admin.venues.controller.js';
import { VenueFaviconCron } from './crons/venue-favicon.cron.js';
import { Brand } from './entities/brand.entity.js';
import { BrandCompetitor } from './entities/brand-competitor.entity.js';
import { BrandDismissal } from './entities/brand-dismissal.entity.js';
import { Review } from './entities/review.entity.js';
import { Venue } from './entities/venue.entity.js';
import { VenueLookup } from './entities/venue-lookup.entity.js';
import { VenueSnapshot } from './entities/venue-snapshot.entity.js';
import { WebMention } from './entities/web-mention.entity.js';
import { BrandService } from './services/brand.service.js';
import { BrandLeadScoreService } from './services/brand-lead-score.service.js';
import { CompetitorService } from './services/competitor.service.js';
import { FaviconFetchService } from './services/favicon-fetch.service.js';
import { GoogleReserveAvailabilityService } from './services/google-reserve-availability.service.js';
import { OpenTableAvailabilityService } from './services/opentable-availability.service.js';
import { ReviewService } from './services/review.service.js';
import { TheForkAvailabilityService } from './services/thefork-availability.service.js';
import { TripadvisorReviewService } from './services/tripadvisor-review.service.js';
import { VenueService } from './services/venue.service.js';
import { VenueBusynessService } from './services/venue-busyness.service.js';
import { VenueDeliveryService } from './services/venue-delivery.service.js';
import { VenueFaviconService } from './services/venue-favicon.service.js';
import { VenueReservationService } from './services/venue-reservation.service.js';
import { VenueScrapeService } from './services/venue-scrape.service.js';
import { VenueSearchRankService } from './services/venue-search-rank.service.js';
import { VenueStatusChangeService } from './services/venue-status-change.service.js';
import { WebMentionService } from './services/web-mention.service.js';
import { BrandAutoMergeWorker } from './workers/brand-auto-merge.worker.js';
import { BrandSearchWorker } from './workers/brand-search.worker.js';

@Module({
	imports: [
		MikroOrmModule.forFeature([
			Venue,
			VenueSnapshot,
			BrandCompetitor,
			VenueLookup,
			Brand,
			BrandDismissal,
			WebMention,
			Review,
			User,
			UserSession,
		]),
		ApifyModule,
		AuthModule,
		CitiesModule,
		FoodTopicsModule,
		ImagesModule,
		LLMModule,
	],
	controllers: [
		AdminReviewsController,
		AdminVenuesController,
		AdminVenueStatusChangesController,
		AdminVenueSearchRanksController,
		AdminBrandsController,
	],
	providers: [
		BrandService,
		BrandAutoMergeWorker,
		BrandSearchWorker,
		VenueService,
		WebMentionService,
		TripadvisorReviewService,
		PressClassificationAgent,
		VenueScrapeService,
		VenueStatusChangeService,
		VenueSearchRankService,
		CompetitorService,
		BrandLeadScoreService,
		VenueBusynessService,
		TheForkAvailabilityService,
		GoogleReserveAvailabilityService,
		OpenTableAvailabilityService,
		VenueReservationService,
		VenueDeliveryService,
		FaviconFetchService,
		VenueFaviconService,
		VenueFaviconCron,
		ReviewService,
		ReviewAnalysisAgent,
	],
	exports: [
		BrandService,
		VenueService,
		WebMentionService,
		TripadvisorReviewService,
		VenueScrapeService,
		VenueStatusChangeService,
		VenueSearchRankService,
		CompetitorService,
		BrandLeadScoreService,
		VenueBusynessService,
		VenueReservationService,
		VenueDeliveryService,
		VenueFaviconService,
		ReviewService,
		MikroOrmModule,
	],
})
export class VenuesModule {}
