/**
 * An error that no other item would get past: the LLM account has no credits left, its key is
 * wrong, its quota is used up. Retrying item by item only repeats it, and a step that skipped
 * every item would look done.
 */
export const isFatalProviderError = (error: unknown): boolean => {
	const e = error as { message?: string; statusCode?: number; status?: number } | undefined;
	// 402 is not enough: Apify answers a run refused for the plan's memory with it
	if ((e?.statusCode ?? e?.status) === 401) return true;
	return /no credits remaining|insufficient_quota|exceeded your current quota|credit balance is too low|invalid (x-)?api[ -_]?key|incorrect api key/i.test(
		e?.message ?? '',
	);
};

/**
 * Runs `fn` over `items` with at most `concurrency` calls in flight. A failing item is
 * reported through `onError` and does not stop the others — except a fatal provider error
 * (`isFatalProviderError`): then no new item starts and the pool rethrows it once the calls in
 * flight are done, so the step fails with the provider's message instead of finishing empty.
 */
export async function runPool<T>(
	items: T[],
	concurrency: number,
	fn: (item: T) => Promise<void>,
	onError?: (item: T, error: Error) => void,
): Promise<void> {
	const queue = [...items];
	let fatal: Error | undefined;
	const worker = async () => {
		for (let item = queue.shift(); item !== undefined && !fatal; item = queue.shift()) {
			try {
				await fn(item);
			} catch (e) {
				if (isFatalProviderError(e)) {
					fatal ??= e as Error;
					queue.length = 0;
					continue;
				}
				onError?.(item, e as Error);
			}
		}
	};
	await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
	if (fatal) throw fatal;
}
