import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import mikroOrmConfig from 'src/mikro-orm.config.js';
import { LLMModule } from 'src/modules/llm/llm.module.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { VenueMatchAgent } from 'src/modules/pipeline/match-mentions/agents/venue-match.agent.js';
import { PostClaimsAgent } from 'src/modules/pipeline/read-posts/agents/post-claims.agent.js';
import { PostGateAgent } from 'src/modules/pipeline/read-posts/agents/post-gate.agent.js';
import { ReviewClaimsAgent } from 'src/modules/pipeline/read-reviews/agents/review-claims.agent.js';
import { ClaimLabelsClassifier } from 'src/modules/statements/classifiers/claim-labels.classifier.js';
import { AspectShortlistService } from 'src/modules/statements/services/aspect-shortlist.service.js';
import { TermTopicAgent } from 'src/modules/topics/agents/term-topic.agent.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';

import { AspectReferenceAgent } from './agents/aspect-reference.agent.js';
import { ClaimPairingAgent } from './agents/claim-pairing.agent.js';
import { EvalAdjudicationAgent } from './agents/eval-adjudication.agent.js';
import { MatchReferenceAgent } from './agents/match-reference.agent.js';
import { PostReferenceAgent } from './agents/post-reference.agent.js';
import { PromotionalReferenceAgent } from './agents/promotional-reference.agent.js';
import { ReviewReferenceAgent } from './agents/review-reference.agent.js';
import { TermReferenceAgent } from './agents/term-reference.agent.js';
import { EvalAdjudicationService } from './services/eval-adjudication.service.js';
import { EvalCitiesService } from './services/eval-cities.service.js';
import { EvalCollectService } from './services/eval-collect.service.js';
import { EvalReferenceService } from './services/eval-reference.service.js';
import { EvalRunService } from './services/eval-run.service.js';
import { EvalScoreService } from './services/eval-score.service.js';

/**
 * The ingestion eval, booted on its own by `eval.cli.ts` (never by `AppModule`): the pipeline's
 * agents, the classifiers a run may label with, the reference and pairing agents, the dev DB read
 * through MikroORM (no migrations, no pg-boss, no crons). `TopicService` only reads the index here;
 * its job queueing is never reached.
 */
@Module({
	imports: [MikroOrmModule.forRoot(mikroOrmConfig), LLMModule],
	providers: [
		{ provide: PgBossService, useValue: {} },
		TopicService,
		ReviewClaimsAgent,
		PostClaimsAgent,
		PostGateAgent,
		ClaimLabelsClassifier,
		AspectShortlistService,
		TermTopicAgent,
		VenueMatchAgent,
		ReviewReferenceAgent,
		PostReferenceAgent,
		MatchReferenceAgent,
		AspectReferenceAgent,
		PromotionalReferenceAgent,
		TermReferenceAgent,
		ClaimPairingAgent,
		EvalAdjudicationAgent,
		EvalAdjudicationService,
		EvalCitiesService,
		EvalCollectService,
		EvalReferenceService,
		EvalRunService,
		EvalScoreService,
	],
})
export class EvalModule {}
