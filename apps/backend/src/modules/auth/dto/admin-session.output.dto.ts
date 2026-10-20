import { IBrowser, ICPU, IDevice, IEngine, IOS, IResult } from 'ua-parser-js';

import { AdminUserOutputDto } from 'src/modules/auth/dto/admin.user.output.dto.js';
import { Platform } from 'src/shared/constants/platform.enum.const.js';

interface AdminSessionOutputDtoUser extends Omit<
	AdminUserOutputDto,
	'devices' | 'verificationRequests'
> {}

export interface AdminSessionOutputDto {
	id: string;
	createdAt: Date;
	expiresAt: Date;
	// The user this session belongs to (hydrated on the global sessions list).
	user?: AdminSessionOutputDtoUser;
	lastSeenAt?: Date | null;
	platform?: Platform | null;
	// App version this session is running (native only). See user-session.entity.ts.
	visitorInfo: {
		ip?: string;
		countryCode?: string;
		userAgent?: string;
		ua?: IResult['ua'];
		device?: IDevice;
		browser?: IBrowser;
		engine?: IEngine;
		os?: IOS;
		cpu?: ICPU;
	};
}
