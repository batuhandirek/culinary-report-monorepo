import { goto } from '$app/navigation';
import { userStore } from '#stores/UserStore.svelte.js';

/**
 * The login page's address for someone who has to come back to `target` (a path with its
 * query). The auth pages read it back through `#components/auth/after-auth.ts`.
 */
export const loginHref = (target: string) =>
	// The venue portal has its own passwordless login
	`${isPortalPath(target) ? '/portal/login' : '/auth/login'}?redirect=${encodeURIComponent(target)}`;

/** A page of the venue portal (`/portal/...`), whose people sign in by e-mail code. */
export const isPortalPath = (path: string) => path === '/portal' || path.startsWith('/portal/');

/** The same for the signup page. */
export const signupHref = (target: string) => `/auth/signup?redirect=${encodeURIComponent(target)}`;

/**
 * The gate of a private route — call it from `onMount`. Waits for the session to be
 * restored; a visitor is sent to login in place of this page and brought back to this
 * exact URL, query included (the tab, the filter, the `?session=` they were heading for).
 *
 * Resolves `true` with a session. On `false` the redirect is already under way: return.
 */
export const requireLogin = async (): Promise<boolean> => {
	await userStore.tryInitialiseStoreIfNotTriedBefore();
	if (userStore.isLoggedIn) return true;
	await goto(loginHref(window.location.pathname + window.location.search), { replace: true });
	return false;
};
