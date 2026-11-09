import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';

import { AuthModule } from '../auth/auth.module.js';
import { CitiesModule } from '../cities/cities.module.js';
import { LLMModule } from '../llm/llm.module.js';
import { TopicsModule } from '../topics/topics.module.js';

import { LandingCopyAgent } from './agents/landing-copy.agent.js';
import { AdminLandingController } from './controllers/admin.landing.controller.js';
import { LandingController } from './controllers/landing.controller.js';
import { LandingEdition } from './entities/landing-edition.entity.js';
import { LandingEditionSchedule } from './schedules/landing-edition.schedule.js';
import { LandingEditionService } from './services/landing-edition.service.js';
import { LandingEditionWorkflow } from './workflows/landing-edition.workflow.js';

/**
 * The front page's live edition of each city (`/`): the last 30 days of posts by others,
 * counted and written up every five days. Reads cities, food topics and the stored posts;
 * nothing imports it.
 */
@Module({
	imports: [
		MikroOrmModule.forFeature([LandingEdition, User, UserSession]),
		AuthModule,
		CitiesModule,
		TopicsModule,
		LLMModule,
	],
	controllers: [LandingController, AdminLandingController],
	providers: [
		LandingEditionService,
		LandingCopyAgent,
		LandingEditionWorkflow,
		LandingEditionSchedule,
	],
})
export class LandingModule {}
