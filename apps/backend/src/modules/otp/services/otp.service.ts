import { Injectable, Logger } from '@nestjs/common';

import { SmsService } from 'src/modules/sms/services/sms.service.js';

import { otpConfig } from '../config/otp.config.js';
import { SendOtpInputDto } from '../dto/send-otp.input.dto.js';

@Injectable()
export class OtpService {
	private readonly logger = new Logger(OtpService.name);
	constructor(private smsService: SmsService) {}

	async sendOtp(opts: SendOtpInputDto): Promise<void> {
		if (otpConfig.OTP_IS_DISABLED) {
			// Nothing is delivered here, so the code has to reach the developer some other way.
			// This is the only branch allowed to print it — everywhere else it would put a
			// working login into the log aggregator.
			this.log(`Send OTP is invoked but disabled. Code for ${opts.to} is "${opts.code}"`);
			return;
		}
		this.log(`Sending OTP to ${opts.to}`);
		const message = `Doğrulama kodunuz: ${opts.code}`;
		await this.smsService.queueSms(opts.to, message);
	}

	private log(msg: string) {
		if (otpConfig.OTP_IS_VERBOSE) {
			this.logger.log(msg);
		}
	}
}
