/**
 * Turkish mobile numbers: one place that reads them however they were written
 * (`+90 532 123 45 67`, `532-123-4567`, `0532 1234567`) and writes them for the API, for a
 * field, and for display.
 */

/** As typed → the one shape the API takes: `05321234567`. */
export const normalisePhone = (typed: string): string => {
	let digits = typed.replace(/\D/g, '');
	if (digits.startsWith('0090')) digits = digits.slice(4);
	else if (digits.startsWith('90') && digits.length > 10) digits = digits.slice(2);
	if (digits.startsWith('5')) digits = `0${digits}`;
	return digits;
};

const isMobile = (digits: string) => /^05\d{9}$/.test(digits);

// The four groups of a full number (`532`, `123`, `45`, `67`), or null for anything else.
const groups = (phone: string): [string, string, string, string] | null => {
	const digits = normalisePhone(phone);
	if (!isMobile(digits)) return null;
	return [digits.slice(1, 4), digits.slice(4, 7), digits.slice(7, 9), digits.slice(9)];
};

/** For display: `+905321234567` → `+90 532 123 45 67`. Anything else comes back untouched. */
export const formatPhone = (phone: string): string => {
	const g = groups(phone);
	return g ? `+90 ${g[0]} ${g[1]} ${g[2]} ${g[3]}` : phone;
};

/**
 * For a field, in the spelling people type: `05321234567` → `0532 123 45 67`. Anything
 * that is not a full number is left as typed, so it never fights the caret mid-entry.
 */
export const formatPhoneInput = (typed: string): string => {
	const g = groups(typed);
	return g ? `0${g[0]} ${g[1]} ${g[2]} ${g[3]}` : typed;
};

/** `+905321234567` → `+90 532 ••• •• 67`: recognisable, not readable over a shoulder. */
export const maskPhone = (phone: string): string => {
	const g = groups(phone);
	return g ? `+90 ${g[0]} ••• •• ${g[3]}` : phone;
};

/** Form validator: a Turkish mobile number in any of the spellings above. */
export const isTurkishMobile = (typed: string): true | string => {
	if (!typed) return true;
	return isMobile(normalisePhone(typed))
		? true
		: 'Cep telefonu numaranı 05XX XXX XX XX biçiminde yaz';
};
