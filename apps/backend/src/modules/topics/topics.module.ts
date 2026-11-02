import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';

import { AuthModule } from '../auth/auth.module.js';
import { BacklogModule } from '../backlog/backlog.module.js';
import { LLMModule } from '../llm/llm.module.js';

import { TermTopicAgent } from './agents/term-topic.agent.js';
import { TopicDiscoveryAgent } from './agents/topic-discovery.agent.js';
import { AdminTermsController } from './controllers/admin.terms.controller.js';
import { AdminTopicsController } from './controllers/admin.topics.controller.js';
import { AdminVenueTopicsController } from './controllers/admin.venue-topics.controller.js';
import { MentionTopic } from './entities/mention-topic.entity.js';
import { MenuItemTopic } from './entities/menu-item-topic.entity.js';
import { Term } from './entities/term.entity.js';
import { TermTopic } from './entities/term-topic.entity.js';
import { Topic } from './entities/topic.entity.js';
import { VenueTopic } from './entities/venue-topic.entity.js';
import { MentionTopicService } from './services/mention-topic.service.js';
import { MenuTopicService } from './services/menu-topic.service.js';
import { TermService } from './services/term.service.js';
import { TopicService } from './services/topic.service.js';
import { TopicDiscoveryService } from './services/topic-discovery.service.js';
import { TopicRelinkService } from './services/topic-relink.service.js';
import { TrendsTopicLookupService } from './services/trends-topic-lookup.service.js';
import { VenueTopicService } from './services/venue-topic.service.js';
import { TopicCityRefreshWorker } from './workers/topic-city-refresh.worker.js';
import { TopicRelinkWorker } from './workers/topic-relink.worker.js';

/**
 * The topic tree (kinds of food and aspects) every reader resolves raw cuisines and files points
 * with, and the terms: every wording ever seen, linked to the topics it is.
 */
@Module({
	imports: [
		MikroOrmModule.forFeature([
			Topic,
			Term,
			TermTopic,
			VenueTopic,
			MentionTopic,
			MenuItemTopic,
			User,
			UserSession,
		]),
		AuthModule,
		BacklogModule,
		LLMModule,
	],
	controllers: [AdminTopicsController, AdminTermsController, AdminVenueTopicsController],
	providers: [
		TopicService,
		TermService,
		TermTopicAgent,
		TopicDiscoveryAgent,
		TopicDiscoveryService,
		TopicRelinkService,
		TopicRelinkWorker,
		TopicCityRefreshWorker,
		MentionTopicService,
		MenuTopicService,
		TrendsTopicLookupService,
		VenueTopicService,
	],
	exports: [
		TopicService,
		TermService,
		TopicRelinkService,
		MentionTopicService,
		MenuTopicService,
		VenueTopicService,
	],
})
export class TopicsModule {}
