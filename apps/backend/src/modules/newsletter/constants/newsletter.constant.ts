// The front page's newsletter sign-up (double opt-in).

/** A confirmation mail goes to one address at most once in this many minutes */
export const NEWSLETTER_RESEND_MINUTES = 10;
/** The token in the confirm and unsubscribe links: random bytes, base64url */
export const NEWSLETTER_TOKEN_BYTES = 16;
/** What a subscriber agreed to, stored with the row as the proof of consent */
export const NEWSLETTER_CONSENT_TEXT =
	'One email a month from Munchwerk: the top 10, the dishes, what opened. No ads. Unsubscribe in one tap.';
