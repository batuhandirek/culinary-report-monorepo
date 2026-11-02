import { isFatalProviderError } from 'src/shared/util/pool.js';

/**
 * The errors and their causes an AI SDK / Mastra call can wrap: `cause`, and `lastError` of
 * the SDK's RetryError (thrown once its retries on a 429 run out).
 */
type ChainedError = { url?: unknown; message?: string; cause?: unknown; lastError?: unknown };

export const errorChain = (error: unknown): ChainedError[] => {
	const chain: ChainedError[] = [];
	const queue: unknown[] = [error];
	while (queue.length > 0 && chain.length < 10) {
		const e = queue.shift();
		if (!e || typeof e !== 'object' || chain.includes(e)) continue;
		chain.push(e);
		queue.push((e as ChainedError).cause, (e as ChainedError).lastError);
	}
	return chain;
};

/**
 * The provider's account itself is unusable: the provider at `host` answered that it has no
 * credits, its quota or spend limit is used up, or its key is wrong. Only an answer from that
 * provider counts, so a 401 from a tool's own API (Apify) never blocks an account.
 */
export const isProviderAccountError = (error: unknown, host: string): boolean => {
	const chain = errorChain(error);
	return (
		chain.some(e => typeof e.url === 'string' && e.url.includes(host)) &&
		chain.some(e => isFatalProviderError(e))
	);
};

/** The provider's own message for a block: the first fatal one in the chain */
export const accountErrorReason = (error: unknown): string =>
	errorChain(error).find(e => isFatalProviderError(e))?.message ?? String(error);
