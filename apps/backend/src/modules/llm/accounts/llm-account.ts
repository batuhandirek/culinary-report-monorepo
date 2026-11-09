import type { LlmModelId, LlmProvider } from '../constants/llm-models.constant.js';

/**
 * A limit an account keeps to over the UTC day (00:00 UTC to 00:00 UTC): its agent calls
 * (`requests`) or their tokens, input and output together (`tokens`). Once used up the account
 * serves none of the limit's models until the next 00:00 UTC, and a durable agent call waiting on
 * it sleeps until then (`LlmWorkflows`). Embeddings and classifiers are never counted or held.
 */
export interface LlmAccountLimit {
	kind: 'requests' | 'tokens';
	max: number;
	/**
	 * The models the limit counts and holds, by exact id (`openai/gpt-5.4` leaves
	 * `openai/gpt-5.4-mini` alone); several share one pool. Unset: every model of the account
	 */
	models?: readonly LlmModelId[];
}

export const requestsPerDay = (
	max: number,
	opts: Pick<LlmAccountLimit, 'models'> = {},
): LlmAccountLimit => ({ kind: 'requests', max, ...opts });

export const tokensPerDay = (
	max: number,
	opts: Pick<LlmAccountLimit, 'models'> = {},
): LlmAccountLimit => ({ kind: 'tokens', max, ...opts });

/**
 * One provider account as the app uses it: one `*.llm-account.ts` per account in this folder, its
 * key read from its own config variable, its limits written next to it. An account whose key is
 * unset is left out. The roster (`LlmModelsService`) serves its models from the accounts of their
 * provider; `LlmAccountQuotas` counts what each one used today.
 */
export interface LlmAccount {
	/** `openai-primary`: what logs, blocks and the ledger (`LlmCall.account`) name it by */
	readonly id: string;
	readonly provider: LlmProvider;
	readonly apiKey: string | undefined;
	readonly limits: readonly LlmAccountLimit[];
	/** Calls are spaced to stay under this many a minute (OpenRouter's free models) */
	readonly requestsPerMinute?: number;
}

export const defineLlmAccount = (account: LlmAccount): LlmAccount => account;

/** An account with its key set: what the roster serves calls with */
export type KeyedLlmAccount = LlmAccount & { readonly apiKey: string };

export const isKeyed = (account: LlmAccount): account is KeyedLlmAccount => !!account.apiKey;

/** Whether a limit counts and holds calls on `model` */
export const limitCovers = (limit: LlmAccountLimit, model: string): boolean =>
	!limit.models || limit.models.includes(model as LlmModelId);
