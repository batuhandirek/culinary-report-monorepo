import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Module } from '@nestjs/common';

import { AuthModule } from 'src/modules/auth/auth.module.js';
import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';

import { NotificationsController } from './controllers/notifications.controller.js';
import { Notification } from './entities/notification.entity.js';

@Module({
	imports: [AuthModule, MikroOrmModule.forFeature([User, UserSession, Notification])],
	controllers: [NotificationsController],
	providers: [],
	exports: [],
})
export class NotificationsModule {}
