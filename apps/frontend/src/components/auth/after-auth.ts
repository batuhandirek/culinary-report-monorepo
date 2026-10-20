import { localHistory } from '#ui/lib/history.svelte.js';

export type AuthPagePath = '/auth/login' | '/auth/signup' | '/auth/forgot-password';

/** As much of a URL as these helpers read — `page.url` is read-only and is not a `URL`. */
interface QueryUrl {
	searchParams: Pick<URLSearchParams, 'get' | 'has'>;
}

/**
 * A `redirect` query value we will follow: a path inside the app. Another host
 * (`//evil.example`, `https://…`) or a way back into the auth pages is dropped.
 */
export const safeRedirectPath = (value: string | null | undefined): string | null => {
	if (!value || !value.startsWith('/')) return null;
	if (value.startsWith('//') || value.startsWith('/\\')) return null;
	if (value === '/auth' || value.startsWith('/auth/')) return null;
	return value;
};

/** The page someone was on before they opened an auth page, if they came from inside the app. */
const pageBeforeAuth = (): string | null => {
	for (let i = localHistory.history.length - 1; i >= 0; i--) {
		const { url } = localHistory.history[i];
		if (!url.pathname.startsWith('/auth')) return url.pathname + url.search;
	}
	return null;
};

/**
 * Where someone lands once they are logged in: the page that sent them here
 * (`?redirect=`), else the page they were reading before they opened login, else
 * `fallback`.
 */
export const afterAuthPath = (url: QueryUrl, fallback: string): string =>
	safeRedirectPath(url.searchParams.get('redirect')) ?? pageBeforeAuth() ?? fallback;

/**
 * Where the close key leads. A `redirect` means a private page bounced them here, and
 * going back there would bounce them again, so that case goes home.
 */
export const leaveAuthPath = (url: QueryUrl): string =>
	url.searchParams.has('redirect') ? '/' : (pageBeforeAuth() ?? '/');

/** A link to another auth page that carries `redirect` along. */
export const authHref = (path: AuthPagePath, url: QueryUrl): string => {
	const redirect = safeRedirectPath(url.searchParams.get('redirect'));
	return redirect ? `${path}?redirect=${encodeURIComponent(redirect)}` : path;
};

// Most specific prefix first.
const REASONS: [prefix: string, what: string][] = [['/admin', 'Yönetim panelini görmek']];

/**
 * Why the auth page opened, for someone a private page sent here: "Mesajlarını görmek
 * için giriş yap." Null when they came on their own.
 */
export const authReason = (url: QueryUrl, view: 'login' | 'signup'): string | null => {
	const redirect = safeRedirectPath(url.searchParams.get('redirect'));
	if (!redirect) return null;
	const what = REASONS.find(([prefix]) => redirect.startsWith(prefix))?.[1] ?? 'Devam etmek';
	return `${what} için ${view === 'login' ? 'giriş yap' : 'üye ol'}.`;
};
