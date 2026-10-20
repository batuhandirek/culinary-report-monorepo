import { Provider } from '@nestjs/common';

import { BrevoClient } from '@getbrevo/brevo';

import { emailConfig } from '../config/email.config.js';

export const brevoProvider: Provider<BrevoClient> = {
	provide: BrevoClient,
	inject: [],
	async useFactory() {
		const brevo = new BrevoClient({
			apiKey: emailConfig.BREVO_API_KEY,
		});
		return brevo;
	},
};
