/**
 * Metering for credential verification codes. Every send is a billable SMS (Verimor) or
 * an email, and the routes that trigger one are either unauthenticated (signup, login,
 * forgot-password) or exempt from Turnstile (native clients always are), so the ceiling
 * here is the only thing between a tap-happy user — or a script — and the SMS bill.
 *
 * Budget is charged per pending request row, which is per (type, identifier, account).
 */

/** Taps inside this window return the in-flight code instead of sending a second one. */
export const VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;

/** Deliveries allowed per pending request before it is refused. */
export const VERIFICATION_MAX_SENDS_PER_WINDOW = 5;

/** Idle gap after which the send budget resets. */
export const VERIFICATION_SEND_WINDOW_MINUTES = 30;
