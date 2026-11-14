import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Global, Module } from '@nestjs/common';

import mikroOrmConfig from 'src/mikro-orm.config.js';
import { DurableWorkflowsModule } from 'src/modules/durable-workflows/durable-workflows.module.js';
import { LLMModule } from 'src/modules/llm/llm.module.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { TurnstileService } from 'src/modules/turnstile/services/turnstile.service.js';

import { TermTopicAgent } from './agents/term-topic.agent.js';
import { TopicService } from './services/topic.service.js';
import { VenueTopicsConvertService } from './services/venue-topics-convert.service.js';

/** What `LLMModule`'s admin side and `TopicService` pull in, stood in for: the converter queues no job and serves no request */
@Global()
@Module({
	providers: [
		{ provide: PgBossService, useValue: {} },
		{ provide: TurnstileService, useValue: {} },
	],
	exports: [PgBossService, TurnstileService],
})
class VenueTopicsStubModule {}

/**
 * The venue-topics converter, booted on its own by `venue-topics.cli.ts` (never by `AppModule`),
 * the way the eval is: agent C, the embeddings and the database (no migrations, no pg-boss, no
 * crons, durable workflows not launched).
 */
@Module({
	imports: [
		MikroOrmModule.forRoot(mikroOrmConfig),
		VenueTopicsStubModule,
		DurableWorkflowsModule.forRoot(undefined, { minimal: true }),
		LLMModule,
	],
	providers: [TermTopicAgent, TopicService, VenueTopicsConvertService],
})
export class VenueTopicsModule {}
