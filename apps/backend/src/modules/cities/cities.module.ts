import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';

import { AuthModule } from '../auth/auth.module.js';
import { LLMModule } from '../llm/llm.module.js';

import { CitySourceSuggestionAgent } from './agents/city-source-suggestion.agent.js';
import { AdminCitiesController } from './controllers/admin.cities.controller.js';
import { AdminCityDaysController } from './controllers/admin.city-days.controller.js';
import { CityDayCron } from './crons/city-day.cron.js';
import { City } from './entities/city.entity.js';
import { CityDay } from './entities/city-day.entity.js';
import { CityEvent } from './entities/city-event.entity.js';
import { CitySource } from './entities/city-source.entity.js';
import { CityService } from './services/city.service.js';
import { CityContextSourcesService } from './services/city-context-sources.service.js';
import { CityDayService } from './services/city-day.service.js';
import { CitySuggestionService } from './services/city-suggestion.service.js';

/** The cities the pipeline covers, each a row with its sources, districts and budgets. */
@Module({
	imports: [
		MikroOrmModule.forFeature([City, CitySource, CityDay, CityEvent, User, UserSession]),
		AuthModule,
		LLMModule,
	],
	controllers: [AdminCitiesController, AdminCityDaysController],
	providers: [
		CityService,
		CitySuggestionService,
		CitySourceSuggestionAgent,
		CityDayService,
		CityContextSourcesService,
		CityDayCron,
	],
	exports: [CityService, CityDayService],
})
export class CitiesModule {}
