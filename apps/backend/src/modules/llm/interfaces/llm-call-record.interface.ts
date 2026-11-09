import type { LlmCallKindEnum } from '../constants/llm-calls.constant.js';

/** One LLM call as the caller reports it to the ledger (`LlmCallsService.record`) */
export interface LlmCallRecord {
	kind: LlmCallKindEnum | 'generate' | 'decide' | 'embed';
	/** The agent's or classifier's id; `embeddings` for an embedding */
	agentId: string;
	/** The model that answered; null when none could */
	model: string | null;
	/** The account that served it (`accounts/*.llm-account.ts` id); null for an embedding, a classifier, or no answer */
	account?: string | null;
	usage: {
		inputTokens: number;
		outputTokens: number;
		cachedInputTokens?: number;
		cacheWriteTokens?: number;
	};
	usd: number;
	durationMs?: number;
	ok: boolean;
	error?: string;
}

/** What files LLM calls: `LlmCallsService`, handed to the LLM services by `LLMModule` */
export interface LlmCallRecorder {
	record(call: LlmCallRecord): void;
}

/** What one account used on one model since a time: agent calls answered, and their tokens */
export interface LlmAccountUsageRow {
	account: string;
	model: string;
	requests: number;
	tokens: number;
}

/** What the LLM account quotas read today's use from: `LlmCallsService`, handed over by `LLMModule` */
export interface LlmAccountUsageReader {
	accountUsageSince(from: Date): Promise<LlmAccountUsageRow[]>;
}
