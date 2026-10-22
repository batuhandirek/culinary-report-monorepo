import { defineConfig } from '@mikro-orm/postgresql';

import { ApifyRun } from 'src/modules/apify/entities/apify-run.entity.js';
import { BrandMember } from 'src/modules/auth/entities/brand-member.entity.js';
import { CredentialVerificationRequest } from 'src/modules/auth/entities/credential-verification-request.entity.js';
import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';
import { BlogEntry } from 'src/modules/blog/entities/blog-entry.entity.js';
import { BlogTag } from 'src/modules/blog/entities/blog-tag.entity.js';
import { City } from 'src/modules/cities/entities/city.entity.js';
import { CityDay } from 'src/modules/cities/entities/city-day.entity.js';
import { CityEvent } from 'src/modules/cities/entities/city-event.entity.js';
import { CitySource } from 'src/modules/cities/entities/city-source.entity.js';
import { Embedding } from 'src/modules/embeddings/entities/embedding.entity.js';
import { FoodTopic } from 'src/modules/food-topics/entities/food-topic.entity.js';
import { FoodTopicIgnoredWord } from 'src/modules/food-topics/entities/food-topic-ignored-word.entity.js';
import { VenueFoodTopic } from 'src/modules/food-topics/entities/venue-food-topic.entity.js';
import { FoodTrendsReport } from 'src/modules/food-trends/entities/food-trends-report.entity.js';
import { CityHighlight } from 'src/modules/highlights/entities/city-highlight.entity.js';
import { FsmStateChange } from 'src/modules/fsm/entities/fsm-state-change.entity.js';
import { Image } from 'src/modules/image/entities/image.entity.js';
import { Notification } from 'src/modules/notification/entities/notification.entity.js';
import { NotificationPreference } from 'src/modules/notification-preferences/entities/notification-preference.entity.js';
import { OutreachTouch } from 'src/modules/outreach/entities/outreach-touch.entity.js';
import { Prospect } from 'src/modules/outreach/entities/prospect.entity.js';
import { PipelineRun } from 'src/modules/pipeline/entities/pipeline-run.entity.js';
import { Report } from 'src/modules/reports/entities/report.entity.js';
import { ReportShare } from 'src/modules/reports/entities/report-share.entity.js';
import { Creator } from 'src/modules/social/entities/creator.entity.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { PostComment } from 'src/modules/social/entities/post-comment.entity.js';
import { SocialAccount } from 'src/modules/social/entities/social-account.entity.js';
import { SocialAccountSnapshot } from 'src/modules/social/entities/social-account-snapshot.entity.js';
import { SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { SocialAccountSubscriber } from 'src/modules/social/subscribers/social-account.subscriber.js';
import { TrendRelatedQuery } from 'src/modules/trends/entities/trend-related-query.entity.js';
import { TrendSearchInterest } from 'src/modules/trends/entities/trend-search-interest.entity.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { BrandCompetitor } from 'src/modules/venues/entities/brand-competitor.entity.js';
import { BrandDismissal } from 'src/modules/venues/entities/brand-dismissal.entity.js';
import { MenuItem } from 'src/modules/venues/entities/menu-item.entity.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { VenueBusyness } from 'src/modules/venues/entities/venue-busyness.entity.js';
import { VenueDeliveryListing } from 'src/modules/venues/entities/venue-delivery-listing.entity.js';
import { OsmPlace } from 'src/modules/venues/entities/osm-place.entity.js';
import { VenueLookup } from 'src/modules/venues/entities/venue-lookup.entity.js';
import { VenueReservationSample } from 'src/modules/venues/entities/venue-reservation-sample.entity.js';
import { VenueSearchRank } from 'src/modules/venues/entities/venue-search-rank.entity.js';
import { VenueSnapshot } from 'src/modules/venues/entities/venue-snapshot.entity.js';
import { VenueStatusChange } from 'src/modules/venues/entities/venue-status-change.entity.js';
import { WebMention } from 'src/modules/venues/entities/web-mention.entity.js';
import { VenueBrandSubscriber } from 'src/modules/venues/subscribers/venue-brand.subscriber.js';

import { mainConfig } from './config/main.config.js';

export default defineConfig({
	entities: [
		Image,
		User,
		UserSession,
		NotificationPreference,
		CredentialVerificationRequest,
		Notification,
		Embedding,
		FsmStateChange,
		BlogEntry,
		BlogTag,
		City,
		CitySource,
		CityDay,
		CityEvent,
		CityHighlight,
		FoodTrendsReport,
		TrendSearchInterest,
		FoodTopic,
		VenueFoodTopic,
		FoodTopicIgnoredWord,
		TrendRelatedQuery,
		Venue,
		VenueSnapshot,
		VenueStatusChange,
		VenueSearchRank,
		BrandCompetitor,
		VenueLookup,
		OsmPlace,
		Brand,
		BrandDismissal,
		WebMention,
		VenueBusyness,
		VenueReservationSample,
		VenueDeliveryListing,
		MenuItem,
		Review,
		SocialPost,
		SocialAccount,
		SocialAccountSnapshot,
		Creator,
		Mention,
		PostComment,
		Report,
		ReportShare,
		ApifyRun,
		PipelineRun,
		Prospect,
		OutreachTouch,
		BrandMember,
	],

	debug: false,
	allowGlobalContext: false,
	forceUtcTimezone: true,
	dbName: mainConfig.DB_NAME,
	host: mainConfig.DB_HOST,
	user: mainConfig.DB_USERNAME,
	password: mainConfig.DB_PASSWORD,
	port: mainConfig.DB_PORT,
	driverOptions: {
		app: 'Culinary Report',
		ssl: mainConfig.DB_SSL ? { rejectUnauthorized: false } : false,
	},

	subscribers: [new VenueBrandSubscriber(), new SocialAccountSubscriber()],

	schemaGenerator: {
		// MikroORM v7 no longer adds `ON UPDATE CASCADE` to foreign keys by itself
		defaultUpdateRule: 'cascade',
	},

	migrations: {
		tableName: 'migrations',
		snapshot: false,
		dropTables: true,
		allOrNothing: true,
		transactional: true,
		pathTs: './src/migrations',
		path: 'apps/backend/dist/migrations',
	},
});
