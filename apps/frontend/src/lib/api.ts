import { Api, type ApiConfig } from 'client';
import type { ExceptionCodes } from 'exceptions/src';

import { browser } from '$app/env';
import { PUBLIC_API_URL } from '$app/env/public';
import { userStore } from '#stores/UserStore.svelte.js';

/**
 * The platform header the backend records on the session. Shared by the authenticated
 * client and the unauthenticated one used for token refresh, so every request carries it.
 */
const getPlatformHeaders = async (): Promise<Record<string, string>> => ({
	'CULINARY-REPORT-SENT-BY': 'web'
});

/** A request's headers as a plain record — the form the generated client sends them in. */
const plainHeaders = (headers: HeadersInit | undefined): Record<string, string> => {
	if (!headers) return {};
	if (headers instanceof Headers || Array.isArray(headers)) {
		return Object.fromEntries(new Headers(headers));
	}
	return headers;
};

/** `init` with `extra` laid over its headers. */
const withHeaders = (
	init: RequestInit | undefined,
	extra: Record<string, string>
): RequestInit => ({
	...init,
	headers: { ...plainHeaders(init?.headers), ...extra }
});

/** The session's bearer header, or nothing: without a token the request goes out anonymous. */
const getAuthHeaders = async (): Promise<Record<string, string>> => {
	try {
		const accessToken = await userStore.getAccessToken();
		return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
	} catch {
		return {};
	}
};

const customFetch = async (input: URL | RequestInfo, init?: RequestInit) =>
	fetch(
		input,
		withHeaders(init, { ...(await getAuthHeaders()), ...(await getPlatformHeaders()) })
	);

const apiSettings: ApiConfig = {
	baseUrl: PUBLIC_API_URL,
	customFetch
};

export const api = new Api(apiSettings);

/**
 * API client without auth, for endpoints that must not trigger the access-token
 * refresh flow (which would recurse). Still sends platform/app-version headers so the
 * backend can record them — e.g. token refresh backfills the session's platform.
 */
export const createUnauthenticatedApi = () =>
	new Api({
		baseUrl: PUBLIC_API_URL,
		customFetch: async (input: URL | RequestInfo, init?: RequestInit) =>
			fetch(input, withHeaders(init, await getPlatformHeaders()))
	});

/**
 * Creates an API client for use in universal load functions (+layout.ts / +page.ts).
 * - During SSR: relies on handleFetch in hooks.server.ts to inject auth from cookies
 * - During client-side navigation: injects auth header from UserStore
 */
export const createLoadApi = (skFetch: typeof globalThis.fetch) => {
	return new Api({
		baseUrl: PUBLIC_API_URL,
		customFetch: async (input: URL | RequestInfo, init?: RequestInit) =>
			skFetch(input, browser ? withHeaders(init, await getAuthHeaders()) : init)
	});
};

/**
 * The HTTP status of a failed call. The client throws the API's parsed error body
 * (`{ status, code, … }`); a dropped connection throws a `TypeError` with neither.
 */
export const apiErrorStatus = (e: unknown): number | undefined => {
	if (typeof e !== 'object' || e === null || !('status' in e)) return undefined;
	return typeof e.status === 'number' ? e.status : undefined;
};

/** The API's exception code on a failed call, if it sent one. */
export const exceptionCodeOf = (e: unknown): ExceptionCodes | undefined => {
	if (typeof e !== 'object' || e === null || !('code' in e)) return undefined;
	return typeof e.code === 'string' ? (e.code as ExceptionCodes) : undefined;
};

/**
 * A load by id that no retry will fix: the record is not there (404, 410), not this
 * user's (403) or the id is malformed (400). Everything else — a 5xx, a timeout, no
 * network — is a failed load: show `ErrorState` with a retry, never "not found".
 */
export const isNotFoundError = (e: unknown) =>
	[400, 403, 404, 410].includes(apiErrorStatus(e) ?? 0);
