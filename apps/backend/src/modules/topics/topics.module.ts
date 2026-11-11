import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';

import { AuthModule } from '../auth/auth.module.js';
import { BacklogModule } from '../backlog/backlog.module.js';
import { LLMModule } from '../llm/llm.module.js';

import { TermTopicAgent } from './agents/term-topic.agent.js';
import { AdminTermsController } from './controllers/admin.terms.controller.js';
import { AdminTopicsController } from './controllers/admin.topics.controller.js';
import { AdminVenueTopicsController } from './controllers/admin.venue-topics.controller.js';
import { MenuItemTopic } from './entities/menu-item-topic.entity.js';
import { Term } from './entities/term.entity.js';
import { TermModifier } from './entities/term-modifier.entity.js';
import { Topic } from './entities/topic.entity.js';
import { TopicClosure } from './entities/topic-closure.entity.js';
import { TopicEdge } from './entities/topic-edge.entity.js';
import { VenueTopic } from './entities/venue-topic.entity.js';
import { MenuTopicService } from './services/menu-topic.service.js';
import { TermService } from './services/term.service.js';
import { TopicService } from './services/topic.service.js';
import { TopicRelinkService } from './services/topic-relink.service.js';
import { TopicRelinkingImportService } from './services/topic-relinking-import.service.js';
import { TrendsTopicLookupService } from './services/trends-topic-lookup.service.js';
import { VenueTopicService } from './services/venue-topic.service.js';
import { TopicCityRefreshWorker } from './workers/topic-city-refresh.worker.js';
import { TopicRelinkWorker } from './workers/topic-relink.worker.js';

/**
 * The topic graph (kinds of food and aspects, and the edges between them) every reader resolves raw
 * cuisines and files claims with, and the terms: every wording ever seen, pointing at the topic it is.
 */
@Module({
	imports: [
		MikroOrmModule.forFeature([
			Topic,
			Term,
			TermModifier,
			TopicEdge,
			TopicClosure,
			VenueTopic,
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
		TopicRelinkService,
		TopicRelinkingImportService,
		TopicRelinkWorker,
		TopicCityRefreshWorker,
		MenuTopicService,
		TrendsTopicLookupService,
		VenueTopicService,
	],
	exports: [
		TopicService,
		TermService,
		TopicRelinkService,
		MenuTopicService,
		VenueTopicService,
	],
})
export class TopicsModule {}
