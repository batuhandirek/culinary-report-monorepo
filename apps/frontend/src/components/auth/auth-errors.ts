import { ExceptionCodes } from 'exceptions/src';

import {
	DEFAULT_INTERNAL_SERVER_ERROR_NOTIFICATION,
	EXCEPTION_MAPPING
} from '#constants/EXCEPTION_MAPPING.js';
import { exceptionCodeOf } from '#lib/api.js';
import { notificationManager } from '#ui/lib/notification-manager.js';

export { exceptionCodeOf };

/**
 * A failure the form has no field for (network, rate limit, the security check): the
 * same toast `createAction` would show. The auth forms call the API themselves so they
 * can put what they *can* place — a wrong password, a taken address — next to the field.
 */
export const notifyAuthError = (error: unknown) => {
	const code = exceptionCodeOf(error);
	const mapped = code ? EXCEPTION_MAPPING[code] : undefined;
	notificationManager.addNotification(mapped ?? DEFAULT_INTERNAL_SERVER_ERROR_NOTIFICATION);
};

/** What the code step says under the cells when a code is refused. */
export const codeErrorText = (error: unknown, lang: 'tr' | 'en' = 'tr'): string => {
	if (lang === 'en') return codeErrorTextEn(error);
	switch (exceptionCodeOf(error)) {
		case ExceptionCodes.INVALID_CREDENTIALS:
		case ExceptionCodes.EMAIL_VERIFICATION_EXPIRED:
		case ExceptionCodes.MOBILE_VERIFICATION_EXPIRED:
			return 'Kod eşleşmedi ya da süresi doldu. Kontrol et ya da yeni bir kod iste.';
		case ExceptionCodes.USER_ALREADY_EXISTS:
			return 'Bu bilgi başka bir hesapta kayıtlı.';
		case ExceptionCodes.TOO_MANY_VERIFICATION_REQUESTS:
			return 'Çok fazla kod istedin. Son gönderdiğimiz kodu kullan ya da biraz sonra tekrar dene.';
		default:
			return 'Doğrulayamadık. Birazdan tekrar dene.';
	}
};

/** The same in English, for the venue portal. */
const codeErrorTextEn = (error: unknown): string => {
	switch (exceptionCodeOf(error)) {
		case ExceptionCodes.INVALID_CREDENTIALS:
		case ExceptionCodes.EMAIL_VERIFICATION_EXPIRED:
		case ExceptionCodes.MOBILE_VERIFICATION_EXPIRED:
			return "That code doesn't match or has expired. Check it, or ask for a new one.";
		case ExceptionCodes.TOO_MANY_VERIFICATION_REQUESTS:
			return 'Too many codes asked for. Use the last one we sent, or try again in a while.';
		default:
			return "We couldn't check the code. Try again in a moment.";
	}
};
