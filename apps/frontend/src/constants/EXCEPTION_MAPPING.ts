import { ExceptionCodes } from 'exceptions/src';

export const DEFAULT_INTERNAL_SERVER_ERROR_NOTIFICATION = {
	title: 'Bir şeyler ters gitti',
	text: 'Birazdan tekrar dene.',
	error: true
};

export const DEFAULT_BAD_REQUEST_ERROR_NOTIFICATION = {
	title: 'Hatalı istek',
	text: 'Kontrol edip tekrar dene.',
	error: true
};

export const DEFAULT_NOT_FOUND_ERROR_NOTIFICATION = {
	title: 'Bulunamadı',
	text: 'Bulunamadı',
	error: true
};

export const EXCEPTION_MAPPING: Record<
	ExceptionCodes,
	undefined | { title: string; text: string; warning?: boolean }
> = {
	// AUTHENTICATION
	[ExceptionCodes.USER_DOES_NOT_EXIST]: {
		title: 'Bu bilgilerle kayıt bulunamadı',
		text: 'Bilgilerini kontrol et.'
	},
	[ExceptionCodes.USER_ALREADY_EXISTS]: {
		title: 'Bu bilgilerle kayıt yapılmış',
		text: 'Bu bilgilerle daha önce kayıt yapılmış.'
	},
	[ExceptionCodes.EMAIL_VERIFICATION_NEEDED]: {
		title: 'E-posta adresin henüz doğrulanmadı',
		text: 'Devam etmek için e-posta adresini doğrula.',
		warning: true
	},
	[ExceptionCodes.EMAIL_VERIFICATION_EXPIRED]: {
		title: 'Bu kodun süresi dolmuş',
		text: 'Yeni bir kod gönderdik, e-postanı kontrol et.'
	},
	[ExceptionCodes.INVALID_CREDENTIALS]: {
		title: 'Bilgiler eşleşmiyor',
		text: 'Bilgiler eşleşmiyor. Kontrol edip tekrar dene.'
	},
	// TODO: HANDLE THIS
	[ExceptionCodes.NO_PASSWORD_DEFINED]: undefined,
	[ExceptionCodes.MOBILE_VERIFICATION_NEEDED]: {
		title: 'Telefon numarası tanımı gerekli',
		text: 'Telefon numaranı ekle.'
	},
	[ExceptionCodes.MOBILE_VERIFICATION_EXPIRED]: undefined,
	[ExceptionCodes.MOBILE_INVALID]: {
		title: 'Girilen telefon numarası geçersiz',
		text: 'Telefon numarası geçersiz. Kontrol edip tekrar dene.'
	},
	[ExceptionCodes.SESSION_NOT_FOUND]: undefined,
	[ExceptionCodes.TURNSTILE_VERIFICATION_FAILED]: {
		title: 'Güvenlik doğrulaması başarısız',
		text: 'Robot olmadığını doğrulayamadık. Tekrar dene.'
	},
	[ExceptionCodes.USER_HAS_NO_PASSWORD]: {
		title: 'Bu hesabın şifresi tanımlı değil',
		text: 'Şifreni sıfırlayarak yeni bir şifre belirle.'
	},
	[ExceptionCodes.TOO_MANY_VERIFICATION_REQUESTS]: {
		title: 'Çok fazla kod istedin',
		text: 'Son gönderdiğimiz kodu kullan ya da biraz sonra tekrar dene.',
		warning: true
	},
	// The venue portal speaks English (its people are Berlin venue owners)
	[ExceptionCodes.NO_BRAND_ACCESS]: {
		title: 'No access to this place',
		text: 'This place is not on your account. Ask us for an invite.'
	},
	[ExceptionCodes.TOO_MANY_COMPETITORS]: {
		title: 'Five competitors at most',
		text: 'Remove one before you add another.',
		warning: true
	},
};
