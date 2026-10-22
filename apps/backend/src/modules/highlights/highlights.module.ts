import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';

import { AuthModule } from '../auth/auth.module.js';
import { CitiesModule } from '../cities/cities.module.js';
import { SocialModule } from '../social/social.module.js';
import { TrendsModule } from '../trends/trends.module.js';

import { AdminHighlightsController } from './controllers/admin.highlights.controller.js';
import { HighlightsController } from './controllers/highlights.controller.js';
import { CityHighlight } from './entities/city-highlight.entity.js';
import { CityHighlightService } from './services/city-highlight.service.js';

/**
 * A city's month in public (`/<city>/<month>`): the most talked-about places, risers, the top
 * post and creators, from the data the monthly run computes. Reads cities, social and trends;
 * none of them import it.
 */
@Module({
	imports: [
		MikroOrmModule.forFeature([CityHighlight, User, UserSession]),
		AuthModule,
		CitiesModule,
		SocialModule,
		TrendsModule,
	],
	controllers: [HighlightsController, AdminHighlightsController],
	providers: [CityHighlightService],
})
export class HighlightsModule {}
