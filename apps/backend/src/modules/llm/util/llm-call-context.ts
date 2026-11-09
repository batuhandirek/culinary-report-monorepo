import { AsyncLocalStorage } from 'node:async_hooks';

/** What the LLM calls made inside `withLlmCallContext` are filed under */
export interface LlmCallContext {
	cityId?: string;
	/** `ingest`, `pipeline:<STEP>`, `backlog:<key>`, `analyst`, … */
	purpose?: string;
}

const storage = new AsyncLocalStorage<LlmCallContext>();

/**
 * Runs `fn` with these fields on every LLM call made inside it, however deep (merged over the
 * context around it). The pipeline sets the city and step, a reading pass the city, a backlog its
 * key, so the ledger can say what each dollar and token was for.
 */
export const withLlmCallContext = <T>(context: LlmCallContext, fn: () => Promise<T>): Promise<T> =>
	storage.run({ ...storage.getStore(), ...context }, fn);

export const currentLlmCallContext = (): LlmCallContext => storage.getStore() ?? {};
