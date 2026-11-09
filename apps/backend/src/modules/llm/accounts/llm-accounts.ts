import { ANTHROPIC_ACCOUNT } from './anthropic.llm-account.js';
import type { LlmAccount } from './llm-account.js';
import { OPENAI_PRIMARY_ACCOUNT } from './openai-primary.llm-account.js';
import { OPENAI_SECONDARY_ACCOUNT } from './openai-secondary.llm-account.js';
import { OPENROUTER_ACCOUNT } from './openrouter.llm-account.js';

/**
 * Every account the roster may serve calls with, OpenAI's in the order they take turns. A new
 * account is a `*.llm-account.ts` file listed here and a key variable in `LLMConfig`. One
 * OpenRouter and one Anthropic account at most. Classifiers and embeddings have accounts of their
 * own (`*.classifier-account.ts`, `*.embedding-account.ts`), counted in the ledger, never held.
 */
export const LLM_ACCOUNTS: readonly LlmAccount[] = [
	OPENAI_PRIMARY_ACCOUNT,
	OPENAI_SECONDARY_ACCOUNT,
	OPENROUTER_ACCOUNT,
	ANTHROPIC_ACCOUNT,
];
