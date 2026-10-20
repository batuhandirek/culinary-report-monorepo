export enum CredentialVerificationRequestTypeEnum {
	SIGNUP_EMAIL = 'SIGNUP_EMAIL',
	SIGNUP_MOBILE_NUMBER = 'SIGNUP_MOBILE_NUMBER',

	CHANGE_EMAIL = 'CHANGE_EMAIL',
	CHANGE_MOBILE_NUMBER = 'CHANGE_MOBILE_NUMBER',

	FORGOT_PASSWORD = 'FORGOT_PASSWORD',

	// Passwordless sign-in to an existing account (the venue portal)
	LOGIN_EMAIL = 'LOGIN_EMAIL',
}
