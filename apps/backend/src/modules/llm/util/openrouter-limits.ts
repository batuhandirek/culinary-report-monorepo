import { nextUtcMidnight } from '../services/openai-accounts.service.js';

import { errorChain } from './provider-errors.js';

/** How long a free model rate-limited upstream (its provider's shared pool) is left alone */
export const OPENROUTER_UPSTREAM_WAIT_MS = 60_000;
/** How long the account waits after hitting the per-minute cap, when OpenRouter names no reset */
export const OPENROUTER_MINUTE_WAIT_MS = 60_000;

/**
 * What an OpenRouter error says about serving again: the whole account (its daily or per-minute
 * free cap, no credit, a rejected key) or one model (rate-limited upstream, no longer served),
 * until when. Null for any other error, which is the call's own.
 */
export interface OpenRouterLimit {
	scope: 'account' | 'model';
	until: number;
	reason: string;
}

type OpenRouterError = {
	url?: unknown;
	message?: string;
	statusCode?: number;
	responseHeaders?: Record<string, string | undefined>;
	responseBody?: unknown;
};

/** `x-ratelimit-reset` is a Unix time in milliseconds (seconds tolerated) */
const resetOf = (headers: OpenRouterError['responseHeaders']): number | null => {
	const raw = Number(headers?.['x-ratelimit-reset']);
	if (!Number.isFinite(raw) || raw <= 0) return null;
	return raw < 1e12 ? raw * 1000 : raw;
};

export const openRouterLimitOf = (
	error: unknown,
	now: number,
	blockMs: number,
): OpenRouterLimit | null => {
	const e = errorChain(error).find(
		c => typeof c.url === 'string' && c.url.includes('openrouter.ai'),
	) as OpenRouterError | undefined;
	if (!e?.statusCode) return null;
	const text = `${e.message ?? ''} ${typeof e.responseBody === 'string' ? e.responseBody : ''}`;
	const reason = e.message ?? `OpenRouter answered ${e.statusCode}`;
	const capped = (until: number) => Math.min(until, now + blockMs);
	switch (e.statusCode) {
		// The key is wrong, or the account owes money (a free model refuses a negative balance too)
		case 401:
		case 402:
			return { scope: 'account', until: now + blockMs, reason };
		// The model is gone from OpenRouter, or no provider serves it now: free models come and go
		case 404:
			return { scope: 'model', until: now + blockMs, reason };
		case 429: {
			const upstream =
				e.responseHeaders?.['x-openrouter-error-origin'] === 'provider' ||
				/upstream/i.test(text);
			if (upstream)
				return { scope: 'model', until: now + OPENROUTER_UPSTREAM_WAIT_MS, reason };
			const reset = resetOf(e.responseHeaders);
			if (/per[- ]day/i.test(text))
				return { scope: 'account', until: capped(reset ?? nextUtcMidnight(now)), reason };
			return {
				scope: 'account',
				until: capped(reset ?? now + OPENROUTER_MINUTE_WAIT_MS),
				reason,
			};
		}
		default:
			return null;
	}
};
