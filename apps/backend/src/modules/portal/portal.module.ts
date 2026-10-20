import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';

import { AuthModule } from '../auth/auth.module.js';
import { CitiesModule } from '../cities/cities.module.js';
import { OutreachModule } from '../outreach/outreach.module.js';
import { ReportsModule } from '../reports/reports.module.js';
import { SocialModule } from '../social/social.module.js';
import { VenuesModule } from '../venues/venues.module.js';

import { PortalController } from './controllers/portal.controller.js';
import { PortalService } from './services/portal.service.js';

/** The venue portal's API. Memberships and the access guard live in `auth`. */
@Module({
	imports: [
		MikroOrmModule.forFeature([Venue, User, UserSession]),
		AuthModule,
		CitiesModule,
		ReportsModule,
		OutreachModule,
		VenuesModule,
		SocialModule,
	],
	controllers: [PortalController],
	providers: [PortalService],
})
export class PortalModule {}
