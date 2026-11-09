import { Logger } from '@nestjs/common';

import type { KeyedLlmAccount } from '../accounts/llm-account.js';
import { accountErrorReason, isProviderAccountError } from '../util/provider-errors.js';

import { LlmAccountQuotas, nextUtcMidnight } from './llm-account-quotas.service.js';

export interface OpenAIAccountsOptions {
	/** The OpenAI accounts with a key (`accounts/*.llm-account.ts`), in the order they take turns */
	accounts: readonly KeyedLlmAccount[];
	rotateAfterRequests: number;
	/** What each account used of its daily limits; an account that is out is skipped */
	quotas?: LlmAccountQuotas;
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

/**
 * Hands out the OpenAI accounts' keys to the agents (`accounts/*.llm-account.ts`; embeddings have
 * their own account, `*.embedding-account.ts`). One account serves
 * `rotateAfterRequests` calls, then the next takes over. An account OpenAI refuses is blocked for
 * that model, and the call is retried on the next account; the daily complimentary allowance is
 * per model, so the account keeps serving the others. How long depends on why (`blockUntil`): its
 * quota until the next 00:00 UTC, when the allowance starts again; no credit for `creditRetryMs`,
 * since credit can be added any time; a rejected key for `blockMs`. None longer than `blockMs`.
 * An account that used up one of its own daily limits (`LlmAccountQuotas`) is skipped the same way
 * until the next 00:00 UTC, and every call is counted against the account that takes it. When every account is blocked for a model, the call throws an error that
 * `isFatalProviderError` recognises, so the pipeline step fails instead of skipping every item.
 *
 * State is in memory: after a restart a blocked account is tried once more per model, fails, and
 * is blocked again. Built by a factory in `LLMModule` from `llmConfig`.
 */
export class OpenAIAccountsService {
	private readonly logger = new Logger(OpenAIAccountsService.name);
	private readonly accounts: readonly KeyedLlmAccount[];
	private readonly quotas: LlmAccountQuotas;
	private readonly rotateAfterRequests: number;
	private readonly blockMs: number;
	private readonly creditRetryMs: number;
	private readonly now: () => number;
	/** `${account index}|${model}` → block */
	private readonly blocks = new Map<string, Block>();
	private current = 0;
	private servedByCurrent = 0;

	constructor(options: OpenAIAccountsOptions) {
		if (options.accounts.length === 0)
			throw new Error('OpenAIAccountsService needs at least one account with a key');
		this.accounts = options.accounts;
		this.now = options.now ?? Date.now;
		this.quotas = options.quotas ?? new LlmAccountQuotas({ now: this.now });
		this.rotateAfterRequests = Math.max(1, options.rotateAfterRequests);
		this.blockMs = options.blockMs;
		this.creditRetryMs = options.creditRetryMs ?? 3_600_000;
	}

	/**
	 * Runs `fn` with an account's key for `model` (`openai/gpt-5.4-mini`). An account error moves
	 * the call to the next account; any other error is rethrown as is. Once no account is left it
	 * throws the last account's error, or `NoOpenAIAccountError` when every one was blocked already.
	 * Each try is a request of the account's day; its tokens are the caller's to add
	 * (`LlmAccountQuotas.addTokens`) once it answers.
	 */
	async run<T>(model: string, fn: (account: KeyedLlmAccount) => Promise<T>): Promise<T> {
		let lastError: unknown;
		// Each failed attempt blocks an account, so this ends once all are blocked; the bound
		// only matters if a block expires mid-loop
		for (let attempt = 0; attempt <= this.accounts.length; attempt++) {
			const account = this.pick(model);
			this.quotas.begin(account, model);
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

	/** 0 when an account can serve `model` now, else when the first block ends (ms since the epoch) */
	nextAvailableAt(model: string): number {
		let soonest = Infinity;
		for (let index = 0; index < this.accounts.length; index++) {
			const block = this.blockOf(index, model);
			if (!block) return 0;
			soonest = Math.min(soonest, block.until);
		}
		return soonest;
	}

	/** The blocks in force, for logs and an admin view */
	status(): Array<{ account: string; model: string; until: Date; reason: string }> {
		return [...this.blocks.values()]
			.filter(block => this.refusalOf(block.index, block.model))
			.map(block => ({
				account: this.accounts[block.index].id,
				model: block.model,
				until: new Date(block.until),
				reason: block.reason,
			}));
	}

	private pick(model: string): KeyedLlmAccount {
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
				return `${account.id} until ${new Date(block.until).toISOString()}: ${block.reason}`;
			})
			.join('; ');
		throw new NoOpenAIAccountError(`No OpenAI account can serve ${model}. ${blocked}`);
	}

	private block(account: KeyedLlmAccount, model: string, error: unknown): void {
		const index = this.accounts.indexOf(account);
		const reason = accountErrorReason(error);
		const until = this.blockUntil(reason);
		// Calls in flight on the same account fail together; log the first
		if (!this.refusalOf(index, model)) {
			this.logger.warn(
				`OpenAI account ${account.id} blocked for ${model} until ${new Date(until).toISOString()}: ${reason}`,
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

	/** The account's block for `model`: OpenAI's refusal, else its own daily limit */
	private blockOf(index: number, model: string): Pick<Block, 'until' | 'reason'> | undefined {
		return (
			this.refusalOf(index, model) ??
			this.quotas.blockOf(this.accounts[index], model) ??
			undefined
		);
	}

	private refusalOf(index: number, model: string): Block | undefined {
		const key = `${index}|${model}`;
		const block = this.blocks.get(key);
		if (!block) return undefined;
		if (block.until > this.now()) return block;
		this.blocks.delete(key);
		this.logger.log(`OpenAI account ${this.accounts[index].id} serves ${model} again`);
		return undefined;
	}
}
