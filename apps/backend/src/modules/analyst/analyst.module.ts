import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';

import { AuthModule } from '../auth/auth.module.js';
import { LLMModule } from '../llm/llm.module.js';

import { AnalystAgent } from './agents/analyst.agent.js';
import { AdminAnalystController } from './controllers/admin.analyst.controller.js';
import { AnalystMessage } from './entities/analyst-message.entity.js';
import { AnalystMessagePart } from './entities/analyst-message-part.entity.js';
import { AnalystThread } from './entities/analyst-thread.entity.js';
import { AnalystGateway } from './gateways/analyst.gateway.js';
import { AnalystAnswerService } from './services/analyst-answer.service.js';
import { AnalystReaderService } from './services/analyst-reader.service.js';
import { AnalystSqlService } from './services/analyst-sql.service.js';
import { AnalystThreadService } from './services/analyst-thread.service.js';
import { AnalystAnswerWorker } from './workers/analyst-answer.worker.js';

/**
 * The analyst (`/admin/ask`, `domain-analyst` skill): admins' free questions about the data in
 * threads, answered by `AnalystAgent` over a read-only SQL window on every module's tables
 * (`AnalystSqlService`, run as a `SELECT`-only role by `AnalystReaderService`), queued as `AnalystAnswerJob` and written live over `AnalystGateway`.
 * Reads other modules' tables by raw SQL only and imports none of their services but auth's.
 */
@Module({
	imports: [
		MikroOrmModule.forFeature([
			AnalystThread,
			AnalystMessage,
			AnalystMessagePart,
			User,
			UserSession,
		]),
		AuthModule,
		LLMModule,
	],
	controllers: [AdminAnalystController],
	providers: [
		AnalystAgent,
		AnalystReaderService,
		AnalystSqlService,
		AnalystThreadService,
		AnalystAnswerService,
		AnalystAnswerWorker,
		AnalystGateway,
	],
})
export class AnalystModule {}
