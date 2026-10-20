import { Module } from '@nestjs/common';

import { SmsModule } from '../sms/sms.module.js';

import { OtpService } from './services/otp.service.js';

@Module({
	imports: [SmsModule],
	controllers: [],
	providers: [OtpService],
	exports: [OtpService],
})
export class OtpModule {}
