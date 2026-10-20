/**
 * Names of the auth cookies `AuthCookieService` sets on login and refresh.
 *
 * Both are `httpOnly`, so the browser stores them but no script can read them — the SPA keeps
 * its own copy of the tokens in persistent storage and sends them as `Authorization`. The
 * cookies exist for the requests the SPA *can't* attach a header to: SvelteKit's server-side
 * `fetch` during SSR forwards the browser's cookies on same-origin requests, so a universal
 * `load` can call the API as the signed-in user.
 *
 * **Precedence is header first, cookie second, everywhere.** Native clients only ever send the
 * header, and an `Authorization` header is an explicit act by the caller, whereas a cookie
 * rides along automatically — so an explicit token must never be silently overridden by one
 * the browser attached. Guards therefore read
 * `headers.authorization?.split(' ')[1] ?? cookies?.[COOKIE_ACCESS_TOKEN]`.
 *
 * CSRF: both are `sameSite: 'lax'`, so they are not attached to cross-site POST/PUT/DELETE —
 * a cross-origin page cannot drive a state-changing call with them. Keep it that way; moving
 * either to `sameSite: 'none'` would need a CSRF token scheme first.
 */
export const COOKIE_ACCESS_TOKEN = 'accessToken';

/** Scoped to `path: '/api/auth'` — only the auth routes ever need it. */
export const COOKIE_REFRESH_TOKEN = 'refreshToken';
