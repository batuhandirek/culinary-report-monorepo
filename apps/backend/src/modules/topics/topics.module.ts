import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';

import { AuthModule } from '../auth/auth.module.js';

import { AdminTopicsController } from './controllers/admin.topics.controller.js';
import { AdminVenueTopicsController } from './controllers/admin.venue-topics.controller.js';
import { Topic } from './entities/topic.entity.js';
import { TopicIgnoredWord } from './entities/topic-ignored-word.entity.js';
import { MentionTopic } from './entities/mention-topic.entity.js';
import { MenuItemTopic } from './entities/menu-item-topic.entity.js';
import { VenueTopic } from './entities/venue-topic.entity.js';
import { TopicService } from './services/topic.service.js';
import { TopicRelinkService } from './services/topic-relink.service.js';
import { MentionTopicService } from './services/mention-topic.service.js';
import { MenuTopicService } from './services/menu-topic.service.js';
import { TrendsTopicLookupService } from './services/trends-topic-lookup.service.js';
import { VenueTopicService } from './services/venue-topic.service.js';
import { TopicCityRefreshWorker } from './workers/topic-city-refresh.worker.js';
import { TopicRelinkWorker } from './workers/topic-relink.worker.js';

/** The food topic taxonomy every kind-of-food reader resolves raw cuisines with. */
@Module({
	imports: [
		MikroOrmModule.forFeature([
			Topic,
			TopicIgnoredWord,
			VenueTopic,
			MentionTopic,
			MenuItemTopic,
			User,
			UserSession,
		]),
		AuthModule,
	],
	controllers: [AdminTopicsController, AdminVenueTopicsController],
	providers: [
		TopicService,
		TopicRelinkService,
		TopicRelinkWorker,
		TopicCityRefreshWorker,
		MentionTopicService,
		MenuTopicService,
		TrendsTopicLookupService,
		VenueTopicService,
	],
	exports: [TopicService, TopicRelinkService, MentionTopicService, MenuTopicService, VenueTopicService],
})
export class TopicsModule {}
