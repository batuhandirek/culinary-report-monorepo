// The phone helpers live in `#lib/phone.ts`. The auth forms show a number in the spelling
// people type it (`0532 123 45 67`), which is that module's `formatPhoneInput`.
export { formatPhoneInput as formatPhone, isTurkishMobile, normalisePhone } from '#lib/phone.js';
