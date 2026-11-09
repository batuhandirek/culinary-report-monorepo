import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';

import { AuthModule } from '../auth/auth.module.js';

import { AdminLlmBacklogsController } from './controllers/admin.llm-backlogs.controller.js';
import { BacklogRun } from './entities/backlog-run.entity.js';
import { LlmBacklogSchedule } from './schedules/llm-backlog.schedule.js';
import { LlmBacklogService } from './services/llm-backlog.service.js';
import { LlmBacklogRegistry } from './services/llm-backlog-registry.service.js';
import { LlmBacklogWorkflows } from './workflows/llm-backlog.workflow.js';

/**
 * LLM backfills drained a little each day (`LlmBacklog`), as the `LlmBacklogWorkflows.drain`
 * workflow. Imports no domain module: owners import this one and register their backlogs with
 * `LlmBacklogRegistry`.
 */
@Module({
	imports: [MikroOrmModule.forFeature([BacklogRun, User, UserSession]), AuthModule],
	controllers: [AdminLlmBacklogsController],
	providers: [LlmBacklogRegistry, LlmBacklogService, LlmBacklogWorkflows, LlmBacklogSchedule],
	exports: [LlmBacklogRegistry],
})
export class BacklogModule {}
