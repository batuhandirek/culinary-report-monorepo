export enum ExceptionCodes {
	// AUTHENTICATION
	USER_DOES_NOT_EXIST = 'user-does-not-exist',
	USER_ALREADY_EXISTS = 'user-already-exists',
	INVALID_CREDENTIALS = 'invalid-credentials',
	NO_PASSWORD_DEFINED = 'no-password-defined',
	EMAIL_VERIFICATION_NEEDED = 'email-verification-needed',
	EMAIL_VERIFICATION_EXPIRED = 'email-verification-expired',
	MOBILE_VERIFICATION_NEEDED = 'mobile-verification-needed',
	MOBILE_VERIFICATION_EXPIRED = 'mobile-verification-expired',
	MOBILE_INVALID = 'mobile-invalid',
	SESSION_NOT_FOUND = 'session-not-found',
	TURNSTILE_VERIFICATION_FAILED = 'turnstile-verification-failed',
	USER_HAS_NO_PASSWORD = 'user-has-no-password',
	TOO_MANY_VERIFICATION_REQUESTS = 'too-many-verification-requests',

	// VENUE PORTAL
	NO_BRAND_ACCESS = 'no-brand-access',
	TOO_MANY_COMPETITORS = 'too-many-competitors',
}
