import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';

import { AuthModule } from '../auth/auth.module.js';
import { BacklogModule } from '../backlog/backlog.module.js';
import { EmbeddingsModule } from '../embeddings/embeddings.module.js';
import { LLMModule } from '../llm/llm.module.js';
import { TopicsModule } from '../topics/topics.module.js';

import { AspectSuggestionAgent } from './agents/aspect-suggestion.agent.js';
import { ClaimPartsAgent } from './agents/claim-parts.agent.js';
import { AdminExploreController } from './controllers/admin.explore.controller.js';
import { AdminStatementsController } from './controllers/admin.statements.controller.js';
import { Statement } from './entities/statement.entity.js';
import { StatementPart } from './entities/statement-part.entity.js';
import { StatementService } from './services/statement.service.js';
import { StatementClusterService } from './services/statement-cluster.service.js';
import { StatementEmbeddingService } from './services/statement-embedding.service.js';
import { StatementInsightService } from './services/statement-insight.service.js';
import { StatementPartsService } from './services/statement-parts.service.js';

/**
 * What posts, articles and reviews say, one claim per row (`Statement`), and what each is about
 * (`StatementPart`: an aspect, or a food wording whose topics are its term's). Agent B
 * (`ClaimPartsAgent`) reads the parts, right after agent A and as the `statement-parts` backlog.
 * Each claim gets a vector (`statement-embeddings` backlog) for search by meaning and the missing
 * aspects (`StatementClusterService`). The Explore page reads them (`StatementInsightService`).
 * Imports no module whose entities it points at (venues, social): entity references need none,
 * and both import this one to write their sources' claims.
 */
@Module({
	imports: [
		MikroOrmModule.forFeature([Statement, StatementPart, User, UserSession]),
		AuthModule,
		BacklogModule,
		TopicsModule,
		LLMModule,
		EmbeddingsModule,
	],
	controllers: [AdminStatementsController, AdminExploreController],
	providers: [
		StatementService,
		StatementPartsService,
		StatementEmbeddingService,
		StatementClusterService,
		StatementInsightService,
		ClaimPartsAgent,
		AspectSuggestionAgent,
	],
	exports: [StatementService, StatementPartsService],
})
export class StatementsModule {}
