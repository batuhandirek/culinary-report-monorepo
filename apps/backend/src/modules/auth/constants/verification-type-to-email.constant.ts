import { EmailVerificationEmail, ForgotPasswordEmail, PortalLoginCodeEmail } from 'emails';

import { CredentialVerificationRequestTypeEnum } from './credential-verification-request-type.enum.constant.js';

// The subject never carries the code: subjects are logged (`EMAIL_IS_VERBOSE`), codes never.
export const VERIFICATION_TYPE_TO_EMAIL: Partial<
	Record<
		CredentialVerificationRequestTypeEnum,
		{ subject: string; template: (props: { code: string }) => React.JSX.Element }
	>
> = {
	[CredentialVerificationRequestTypeEnum.SIGNUP_EMAIL]: {
		subject: 'E-posta doğrulama kodun',
		template: EmailVerificationEmail,
	},
	[CredentialVerificationRequestTypeEnum.CHANGE_EMAIL]: {
		subject: 'E-posta doğrulama kodun',
		template: EmailVerificationEmail,
	},
	[CredentialVerificationRequestTypeEnum.FORGOT_PASSWORD]: {
		subject: 'Şifre sıfırlama kodun',
		template: ForgotPasswordEmail,
	},
	// Only the venue portal signs in by code, and its people read English
	[CredentialVerificationRequestTypeEnum.LOGIN_EMAIL]: {
		subject: 'Your Culinary Report sign-in code',
		template: PortalLoginCodeEmail,
	},
};
