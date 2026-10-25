import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';

import { AuthModule } from '../auth/auth.module.js';
import { EmailModule } from '../email/email.module.js';

import { AdminNewsletterController } from './controllers/admin.newsletter.controller.js';
import { NewsletterController } from './controllers/newsletter.controller.js';
import { NewsletterSubscriber } from './entities/newsletter-subscriber.entity.js';
import { NewsletterService } from './services/newsletter.service.js';

/** The front page's monthly e-mail list, double opt-in. Sending the newsletter itself is not built yet. */
@Module({
	imports: [
		MikroOrmModule.forFeature([NewsletterSubscriber, User, UserSession]),
		AuthModule,
		EmailModule,
	],
	controllers: [NewsletterController, AdminNewsletterController],
	providers: [NewsletterService],
})
export class NewsletterModule {}
