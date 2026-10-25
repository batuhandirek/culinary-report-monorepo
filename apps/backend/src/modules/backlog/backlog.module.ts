import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';

import { AuthModule } from '../auth/auth.module.js';

import { AdminLlmBacklogsController } from './controllers/admin.llm-backlogs.controller.js';
import { LlmBacklogCron } from './crons/llm-backlog.cron.js';
import { BacklogRun } from './entities/backlog-run.entity.js';
import { LlmBacklogService } from './services/llm-backlog.service.js';
import { LlmBacklogRegistry } from './services/llm-backlog-registry.service.js';
import { LlmBacklogWorker } from './workers/llm-backlog.worker.js';

/**
 * LLM backfills drained a little each day (`LlmBacklog`). Imports no domain module: owners
 * import this one and register their backlogs with `LlmBacklogRegistry`.
 */
@Module({
	imports: [MikroOrmModule.forFeature([BacklogRun, User, UserSession]), AuthModule],
	controllers: [AdminLlmBacklogsController],
	providers: [LlmBacklogRegistry, LlmBacklogService, LlmBacklogCron, LlmBacklogWorker],
	exports: [LlmBacklogRegistry],
})
export class BacklogModule {}
