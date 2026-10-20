import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MikroORM } from '@mikro-orm/postgresql';

import { Module, OnApplicationBootstrap } from '@nestjs/common';

import { UserService } from 'src/modules/auth/services/user.service.js';
import { EmailModule } from 'src/modules/email/email.module.js';
import { NotificationPreferencesModule } from 'src/modules/notification-preferences/notification-preferences.module.js';

import { ImagesModule } from '../image/images.module.js';
import { OtpModule } from '../otp/otp.module.js';

import { AdminUserSessionsController } from './controllers/admin.user-sessions.controller.js';
import { AdminUsersController } from './controllers/admin.users.controller.js';
import { ChangeEmailController } from './controllers/change-email.controller.js';
import { ChangeMobileNumberController } from './controllers/change-mobile-number.controller.js';
import { ChangePasswordController } from './controllers/change-password.controller.js';
import { ForgotPasswordController } from './controllers/forgot-password.controller.js';
import { LoginController } from './controllers/login.controller.js';
import { LogoutController } from './controllers/logout.controller.js';
import { MeController } from './controllers/me.controller.js';
import { RefreshTokenController } from './controllers/refresh-token.controller.js';
import { SessionsController } from './controllers/sessions.controller.js';
import { SignupController } from './controllers/signup.controller.js';
import { AccountDeletionReminderCron } from './crons/account-deletion-reminder.cron.js';
import { DeleteAccountsCron } from './crons/delete-accounts.cron.js';
import { CredentialVerificationRequest } from './entities/credential-verification-request.entity.js';
import { User } from './entities/user.entity.js';
import { UserSession } from './entities/user-session.entity.js';
import { BrandMember } from './entities/brand-member.entity.js';
import { BrandAccessGuard } from './guards/brand-access.guard.js';
import { AccountNoticeService } from './services/account-notice.service.js';
import { AuthCookieService } from './services/auth-cookie.service.js';
import { JwtService } from './services/jwt.service.js';
import { LoginService } from './services/login.service.js';
import { PasswordService } from './services/password.service.js';
import { UserSessionService } from './services/user-session.service.js';
import { BrandMemberService } from './services/brand-member.service.js';
import { VerificationService } from './services/verification.service.js';

@Module({
	imports: [
		MikroOrmModule.forFeature([
			User,
			UserSession,
			CredentialVerificationRequest,
			BrandMember,
		]),
		EmailModule,
		OtpModule,
		NotificationPreferencesModule,
		ImagesModule,
	],
	controllers: [
		MeController,
		LoginController,
		LogoutController,
		SignupController,
		ForgotPasswordController,
		ChangePasswordController,
		ChangeMobileNumberController,
		ChangeEmailController,
		SessionsController,
		RefreshTokenController,

		// Admin
		AdminUsersController,
		AdminUserSessionsController,
	],
	providers: [
		JwtService,
		UserService,
		AccountNoticeService,
		VerificationService,
		LoginService,
		UserSessionService,
		PasswordService,
		AuthCookieService,
		BrandMemberService,
		BrandAccessGuard,
		AccountDeletionReminderCron,
		DeleteAccountsCron,
	],
	exports: [JwtService, UserService, BrandMemberService, BrandAccessGuard],
})
export class AuthModule implements OnApplicationBootstrap {
	constructor(private mikroOrm: MikroORM) {}

	async onApplicationBootstrap() {
		// const em = this.mikroOrm.em.fork();
		// const adminSeeder = new AdminSeeder();
		// await adminSeeder.run(em);
		// const systemUserSeeder = new SystemUserSeeder();
		// await systemUserSeeder.run(em);
	}
}
