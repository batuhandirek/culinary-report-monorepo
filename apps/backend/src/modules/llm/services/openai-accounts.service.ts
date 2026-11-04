import { Logger } from '@nestjs/common';

import { accountErrorReason, isProviderAccountError } from '../util/provider-errors.js';

export interface OpenAIAccount {
	/** `#1 (…abcd)`: position in `OPENAI_API_KEYS` and the key's last four characters, for logs */
	label: string;
	apiKey: string;
}

export interface OpenAIAccountsOptions {
	apiKeys: string[];
	rotateAfterRequests: number;
	/** The longest block, and a rejected key's */
	blockMs: number;
	/** How soon an account out of credit is tried again: credit can be added any time */
	creditRetryMs?: number;
	now?: () => number;
}

interface Block {
	index: number;
	model: string;
	until: number;
	reason: string;
}

/**
 * Every account is blocked for the model. The message carries OpenAI's own reasons, so
 * `isFatalProviderError` matches it.
 */
export class NoOpenAIAccountError extends Error {}

/** OpenAI answered that the account has no credits, its quota is used up or its key is wrong */
export const isOpenAIAccountError = (error: unknown): boolean =>
	isProviderAccountError(error, 'api.openai.com');

const NO_CREDIT = /no credits remaining|credit balance is too low/i;
const QUOTA = /insufficient_quota|exceeded your current quota/i;

/** The next 00:00 UTC after `now`, when OpenAI's complimentary daily tokens start again */
export const nextUtcMidnight = (now: number): number => {
	const day = new Date(now);
	return Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + 1);
};

/**
 * Hands out the OpenAI accounts' keys (`OPENAI_API_KEYS`). One account serves
 * `rotateAfterRequests` calls, then the next takes over. An account OpenAI refuses is blocked for
 * that model, and the call is retried on the next account; the daily complimentary allowance is
 * per model, so the account keeps serving the others. How long depends on why (`blockUntil`): its
 * quota until the next 00:00 UTC, when the allowance starts again; no credit for `creditRetryMs`,
 * since credit can be added any time; a rejected key for `blockMs`. None longer than `blockMs`. When every account is blocked for a model, the call throws an error that
 * `isFatalProviderError` recognises, so the pipeline step fails instead of skipping every item.
 *
 * State is in memory: after a restart a blocked account is tried once more per model, fails, and
 * is blocked again. Built by a factory in `LLMModule` from `llmConfig`.
 */
export class OpenAIAccountsService {
	private readonly logger = new Logger(OpenAIAccountsService.name);
	private readonly accounts: OpenAIAccount[];
	private readonly rotateAfterRequests: number;
	private readonly blockMs: number;
	private readonly creditRetryMs: number;
	private readonly now: () => number;
	/** `${account index}|${model}` → block */
	private readonly blocks = new Map<string, Block>();
	private current = 0;
	private servedByCurrent = 0;

	constructor(options: OpenAIAccountsOptions) {
		if (options.apiKeys.length === 0)
			throw new Error('OpenAIAccountsService needs at least one API key');
		this.accounts = options.apiKeys.map((apiKey, i) => ({
			label: `#${i + 1} (…${apiKey.slice(-4)})`,
			apiKey,
		}));
		this.rotateAfterRequests = Math.max(1, options.rotateAfterRequests);
		this.blockMs = options.blockMs;
		this.creditRetryMs = options.creditRetryMs ?? 3_600_000;
		this.now = options.now ?? Date.now;
	}

	/**
	 * Runs `fn` with an account's key for `model` (`openai/gpt-5.4-mini`). An account error moves
	 * the call to the next account; any other error is rethrown as is. Once no account is left it
	 * throws the last account's error, or `NoOpenAIAccountError` when every one was blocked already.
	 */
	async run<T>(model: string, fn: (account: OpenAIAccount) => Promise<T>): Promise<T> {
		let lastError: unknown;
		// Each failed attempt blocks an account, so this ends once all are blocked; the bound
		// only matters if a block expires mid-loop
		for (let attempt = 0; attempt <= this.accounts.length; attempt++) {
			const account = this.pick(model);
			try {
				return await fn(account);
			} catch (error) {
				if (!isOpenAIAccountError(error)) throw error;
				this.block(account, model, error);
				lastError = error;
			}
		}
		throw lastError;
	}

	/** The blocks in force, for logs and an admin view */
	status(): Array<{ account: string; model: string; until: Date; reason: string }> {
		return [...this.blocks.values()]
			.filter(block => this.blockOf(block.index, block.model))
			.map(block => ({
				account: this.accounts[block.index].label,
				model: block.model,
				until: new Date(block.until),
				reason: block.reason,
			}));
	}

	private pick(model: string): OpenAIAccount {
		if (this.servedByCurrent >= this.rotateAfterRequests) {
			this.current = (this.current + 1) % this.accounts.length;
			this.servedByCurrent = 0;
		}
		for (let i = 0; i < this.accounts.length; i++) {
			const index = (this.current + i) % this.accounts.length;
			if (this.blockOf(index, model)) continue;
			this.servedByCurrent++;
			return this.accounts[index];
		}

		const blocked = this.accounts
			.map((account, index) => {
				const block = this.blockOf(index, model)!;
				return `${account.label} until ${new Date(block.until).toISOString()}: ${block.reason}`;
			})
			.join('; ');
		throw new NoOpenAIAccountError(`No OpenAI account can serve ${model}. ${blocked}`);
	}

	private block(account: OpenAIAccount, model: string, error: unknown): void {
		const index = this.accounts.indexOf(account);
		const reason = accountErrorReason(error);
		const until = this.blockUntil(reason);
		// Calls in flight on the same account fail together; log the first
		if (!this.blockOf(index, model)) {
			this.logger.warn(
				`OpenAI account ${account.label} blocked for ${model} until ${new Date(until).toISOString()}: ${reason}`,
			);
		}
		this.blocks.set(`${index}|${model}`, { index, model, until, reason });
	}

	/** When a block for this refusal ends: see the class comment */
	private blockUntil(reason: string): number {
		const now = this.now();
		const longest = now + this.blockMs;
		if (NO_CREDIT.test(reason)) return Math.min(now + this.creditRetryMs, longest);
		if (QUOTA.test(reason)) return Math.min(nextUtcMidnight(now), longest);
		return longest;
	}

	private blockOf(index: number, model: string): Block | undefined {
		const key = `${index}|${model}`;
		const block = this.blocks.get(key);
		if (!block) return undefined;
		if (block.until > this.now()) return block;
		this.blocks.delete(key);
		this.logger.log(`OpenAI account ${this.accounts[index].label} serves ${model} again`);
		return undefined;
	}
}
