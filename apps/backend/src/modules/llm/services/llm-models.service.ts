import { Logger, OnApplicationBootstrap } from '@nestjs/common';

import {
	isPaidModel,
	LlmModelChoice,
	LlmModelId,
	LlmProvider,
	modelsFor,
	providerOf,
} from '../constants/llm-models.constant.js';
import { isLlmPaid } from '../util/llm-scope.js';
import { OpenRouterLimit, openRouterLimitOf } from '../util/openrouter-limits.js';
import { accountErrorReason, isProviderAccountError } from '../util/provider-errors.js';

import {
	isOpenAIAccountError,
	NoOpenAIAccountError,
	OpenAIAccountsService,
} from './openai-accounts.service.js';

/** A model whose provider can't serve now (no key, blocked): the next model is tried */
const SKIPPED = Symbol('skipped');

/** A block this short (the minute's cap, a model busy upstream) is waited out; a longer one skips OpenRouter */
export const OPENROUTER_MAX_WAIT_MS = 2 * 60_000;
/** Tries of one call on OpenRouter through short blocks before it moves on */
export const OPENROUTER_TRIES = 4;

interface Block {
	until: number;
	reason: string;
}

/** What a call is made with: the model id and the key of the account serving it */
export interface LlmModelKey {
	id: LlmModelId;
	apiKey: string;
}

export interface LlmModelsOptions {
	openAIAccounts: OpenAIAccountsService;
	/** Unset: the roster's Claude models are left out */
	anthropicApiKey?: string;
	/** Unset: OpenRouter's free model is left out (`OPENROUTER_AI_API_KEY`) */
	openRouterApiKey?: string;
	/** OpenRouter's cap on free-model requests a minute: its calls are spaced to stay under it */
	openRouterPerMinute?: number;
	/** Providers left out of the roster (`LLM_DISABLE_OPENAI`, `…_ANTHROPIC`, `…_OPENROUTER`) */
	disabled?: Partial<Record<LlmProvider, boolean>>;
	/** Agents put on another choice than their own, by agent id (`LLM_AGENT_MODELS`) */
	agentModels?: Record<string, LlmModelChoice>;
	/** Only the reading agents run outside `llmPaid` (`LLM_INGESTION_ONLY`) */
	ingestionOnly?: boolean;
	blockMs: number;
	now?: () => number;
	/** How a wait is spent (a test moves its clock instead) */
	sleep?: (ms: number) => Promise<void>;
}

/**
 * Every model of the choice is left out (disabled, no key, blocked, or paid outside `llmPaid`);
 * `isFatalProviderError` matches the message, so a step stops instead of failing item by item.
 */
export class NoModelError extends Error {}

/** Anthropic answered that the account has no credit, its spend limit is reached or its key is wrong */
export const isAnthropicAccountError = (error: unknown): boolean =>
	isProviderAccountError(error, 'api.anthropic.com');

/**
 * Picks the model for a call (`LLM_ROSTER`). The choice's models are tried in order; one whose
 * provider can't serve moves the call to the next: OpenAI once every account is out of allowance
 * for that model (`OpenAIAccountsService`), Anthropic once it says the credit is used up, the spend
 * limit is reached or the key is wrong (blocked for `blockMs`, every Claude model together: the
 * credit is one), OpenRouter once its free requests of the day are used up (blocked until its
 * reset) or its key is refused. OpenRouter's calls are spaced to its per-minute cap, and a short
 * block (the minute's cap hit anyway, a free model busy at its provider) is waited out and the
 * call tried again, so a busy free model slows a step down instead of stopping it. Any other
 * error is rethrown as is. When no model is left, the last provider's error is thrown, which
 * `isFatalProviderError` matches.
 *
 * A disabled provider is left out, and so are the paid models (Claude) except inside `llmPaid`
 * or for an agent with `paidFallback`: production never pays, except for the few small agents the
 * user allowed, and work the user starts by hand. State is in memory, as the
 * OpenAI blocks are. Built by a factory in `LLMModule` from `llmConfig`.
 */
export class LlmModelsService implements OnApplicationBootstrap {
	private readonly logger = new Logger(LlmModelsService.name);
	private readonly openAIAccounts: OpenAIAccountsService;
	private readonly anthropicApiKey?: string;
	private readonly openRouterApiKey?: string;
	/** Between two OpenRouter calls' starts */
	private readonly openRouterSpacingMs: number;
	private readonly disabled: Record<LlmProvider, boolean>;
	private readonly agentModels: Record<string, LlmModelChoice>;
	private readonly ingestionOnly: boolean;
	private readonly agents = new Set<string>();
	private readonly blockMs: number;
	private readonly now: () => number;
	private readonly sleep: (ms: number) => Promise<void>;
	private anthropicBlock: Block | null = null;
	/** The OpenRouter account's block (its daily or minute cap, credit, key) */
	private openRouterBlock: Block | null = null;
	/** One OpenRouter model's block (busy upstream, no longer served) */
	private readonly openRouterModelBlocks = new Map<LlmModelId, Block>();
	/** When the next OpenRouter call may start */
	private nextOpenRouterStart = 0;
	/** The model that served each choice last, to log a move once instead of per call */
	private readonly servedBy = new Map<string, LlmModelId>();

	constructor(options: LlmModelsOptions) {
		this.openAIAccounts = options.openAIAccounts;
		this.anthropicApiKey = options.anthropicApiKey || undefined;
		this.openRouterApiKey = options.openRouterApiKey || undefined;
		// 5% under the cap: OpenRouter counts the minute on its side of the network
		this.openRouterSpacingMs = Math.ceil((60_000 / (options.openRouterPerMinute ?? 20)) * 1.05);
		this.disabled = {
			openai: options.disabled?.openai ?? false,
			anthropic: options.disabled?.anthropic ?? false,
			openrouter: options.disabled?.openrouter ?? false,
		};
		this.agentModels = options.agentModels ?? {};
		this.ingestionOnly = options.ingestionOnly ?? false;
		this.blockMs = options.blockMs;
		this.now = options.now ?? Date.now;
		this.sleep = options.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
	}

	/** An agent's id, so the boot log can say which `LLM_AGENT_MODELS` entry names no agent */
	registerAgent(id: string): void {
		this.agents.add(id);
	}

	onApplicationBootstrap(): void {
		const off = (['openai', 'anthropic', 'openrouter'] as const).filter(p => this.disabled[p]);
		if (off.length) this.logger.warn(`Left out of the roster: ${off.join(', ')}`);
		if (this.ingestionOnly)
			this.logger.warn(
				'LLM_INGESTION_ONLY: only the reading agents run, the rest are paused',
			);
		if (!this.anthropicApiKey) this.logger.log('No ANTHROPIC_API_KEY: Claude is left out');
		if (!this.openRouterApiKey)
			this.logger.log('No OPENROUTER_AI_API_KEY: OpenRouter is left out');
		for (const [agent, choice] of Object.entries(this.agentModels)) {
			if (!this.agents.has(agent))
				this.logger.error(`LLM_AGENT_MODELS names ${agent}, which is no agent`);
			else if (modelsFor(choice).every(isPaidModel))
				this.logger.error(
					`LLM_AGENT_MODELS puts ${agent} on ${choice}, which has no free model`,
				);
			else this.logger.log(`${agent} runs on ${choice}`);
		}
	}

	/** The agent's choice: its `LLM_AGENT_MODELS` entry, else its own */
	choiceFor(agentId: string, own: LlmModelChoice): LlmModelChoice {
		return this.agentModels[agentId] ?? own;
	}

	/**
	 * Runs `fn` on the first model of `choice` that can serve it; says which one did. `paidFallback`
	 * (an agent's `BaseMastraAgentConfig.paidFallback`) lets the choice's Claude models serve
	 * outside `llmPaid` too, behind its free ones. Under `ingestionOnly` a call that is not
	 * `ingestion` (an agent's `BaseMastraAgentConfig.ingestion`) fails at once, as with no model
	 * left, so its step stops and its items wait.
	 */
	async run<T>(
		choice: LlmModelChoice,
		fn: (model: LlmModelKey) => Promise<T>,
		opts: { paidFallback?: boolean; ingestion?: boolean; agentId?: string } = {},
	): Promise<{ result: T; model: LlmModelId }> {
		if (this.ingestionOnly && !opts.ingestion && !isLlmPaid())
			throw new NoModelError(
				`No model can serve ${opts.agentId ?? choice}: paused, only the reading runs (LLM_INGESTION_ONLY)`,
			);
		const freeOnly = !isLlmPaid() && !opts.paidFallback;
		const models = modelsFor(choice).filter(
			model => !this.disabled[providerOf(model)] && !(freeOnly && isPaidModel(model)),
		);
		let lastError: unknown;
		for (const model of models) {
			try {
				const result = await this.runOn(model, fn);
				if (result === SKIPPED) continue;
				this.noteServedBy(choice, model);
				return { result, model };
			} catch (error) {
				if (!this.isUnavailable(model, error)) throw error;
				lastError = error;
			}
		}
		throw (
			lastError ??
			new NoModelError(`No model can serve ${choice}: ${this.whyNone(choice, freeOnly)}`)
		);
	}

	private whyNone(choice: LlmModelChoice, freeOnly: boolean): string {
		return modelsFor(choice)
			.map(model => {
				const provider = providerOf(model);
				const openRouterBlock =
					provider === 'openrouter' ? this.openRouterBlockOf(model) : null;
				const why =
					this.disabled[provider] ? 'disabled'
					: freeOnly && isPaidModel(model) ?
						'paid, and only free models run outside llmPaid'
					: provider === 'anthropic' && !this.anthropicApiKey ? 'no ANTHROPIC_API_KEY'
					: provider === 'anthropic' && this.anthropicBlock ?
						`blocked: ${this.anthropicBlock.reason}`
					: provider === 'openrouter' && !this.openRouterApiKey ?
						'no OPENROUTER_AI_API_KEY'
					: openRouterBlock ? `blocked: ${openRouterBlock.reason}`
					: 'unavailable';
				return `${model} ${why}`;
			})
			.join('; ');
	}

	/** The Anthropic and OpenRouter account blocks in force, for logs and an admin view */
	status(): {
		anthropic: { until: Date; reason: string } | null;
		openrouter: { until: Date; reason: string } | null;
	} {
		const shown = (block: Block | null) =>
			block && { until: new Date(block.until), reason: block.reason };
		return {
			anthropic: shown(this.blockOfAnthropic()),
			openrouter: shown(this.activeBlock(this.openRouterBlock)),
		};
	}

	private async runOn<T>(
		model: LlmModelId,
		fn: (model: LlmModelKey) => Promise<T>,
	): Promise<T | typeof SKIPPED> {
		if (model.startsWith('openai/'))
			return this.openAIAccounts.run(model, account =>
				fn({ id: model, apiKey: account.apiKey }),
			);
		if (model.startsWith('anthropic/')) {
			if (!this.anthropicApiKey || this.blockOfAnthropic()) return SKIPPED;
			return fn({ id: model, apiKey: this.anthropicApiKey });
		}
		if (model.startsWith('openrouter/')) return this.runOnOpenRouter(model, fn);
		throw new Error(`No provider for ${model}`);
	}

	/**
	 * One call on OpenRouter: spaced to the per-minute cap, a short block waited out and the call
	 * tried again (up to `OPENROUTER_TRIES`), a long one (the day's free requests used up) skipped.
	 * The limit an error names is recorded here; `isUnavailable` then moves the call on.
	 */
	private async runOnOpenRouter<T>(
		model: LlmModelId,
		fn: (model: LlmModelKey) => Promise<T>,
	): Promise<T | typeof SKIPPED> {
		const apiKey = this.openRouterApiKey;
		if (!apiKey) return SKIPPED;
		for (let attempt = 1; ; attempt++) {
			const block = this.openRouterBlockOf(model);
			if (block) {
				const wait = block.until - this.now();
				if (wait > OPENROUTER_MAX_WAIT_MS) return SKIPPED;
				await this.sleep(wait);
			}
			await this.openRouterTurn();
			try {
				return await fn({ id: model, apiKey });
			} catch (error) {
				const limit = openRouterLimitOf(error, this.now(), this.blockMs);
				if (!limit) throw error;
				this.blockOpenRouter(model, limit);
				if (
					attempt >= OPENROUTER_TRIES ||
					limit.until - this.now() > OPENROUTER_MAX_WAIT_MS
				)
					throw error;
			}
		}
	}

	/** Waits for this call's slot under the per-minute cap; slots are taken in call order */
	private async openRouterTurn(): Promise<void> {
		const now = this.now();
		const at = Math.max(now, this.nextOpenRouterStart);
		this.nextOpenRouterStart = at + this.openRouterSpacingMs;
		if (at > now) await this.sleep(at - now);
	}

	private blockOpenRouter(model: LlmModelId, limit: OpenRouterLimit): void {
		const block = { until: limit.until, reason: limit.reason };
		if (limit.scope === 'model') {
			if (!this.activeBlock(this.openRouterModelBlocks.get(model) ?? null))
				this.logger.warn(
					`${model} left alone until ${new Date(limit.until).toISOString()}: ${limit.reason}`,
				);
			this.openRouterModelBlocks.set(model, block);
			return;
		}
		// Calls in flight fail together; log the first
		if (!this.activeBlock(this.openRouterBlock))
			this.logger.warn(
				`OpenRouter blocked until ${new Date(limit.until).toISOString()}: ${limit.reason}`,
			);
		this.openRouterBlock = block;
	}

	/** The block an OpenRouter model is under: the account's or its own, whichever ends later */
	private openRouterBlockOf(model: LlmModelId): Block | null {
		const account = this.activeBlock(this.openRouterBlock);
		const own = this.activeBlock(this.openRouterModelBlocks.get(model) ?? null);
		if (!account) return own;
		if (!own) return account;
		return own.until > account.until ? own : account;
	}

	private activeBlock(block: Block | null): Block | null {
		return block && block.until > this.now() ? block : null;
	}

	/** The provider can't serve now; blocks Anthropic when it said so */
	private isUnavailable(model: LlmModelId, error: unknown): boolean {
		if (model.startsWith('openai/'))
			return error instanceof NoOpenAIAccountError || isOpenAIAccountError(error);
		// `runOnOpenRouter` recorded the block already
		if (model.startsWith('openrouter/'))
			return openRouterLimitOf(error, this.now(), this.blockMs) !== null;
		if (!isAnthropicAccountError(error)) return false;
		const reason = accountErrorReason(error);
		const until = this.now() + this.blockMs;
		// Calls in flight fail together; log the first
		if (!this.blockOfAnthropic()) {
			this.logger.warn(`Anthropic blocked until ${new Date(until).toISOString()}: ${reason}`);
		}
		this.anthropicBlock = { until, reason };
		return true;
	}

	private blockOfAnthropic(): Block | null {
		if (!this.anthropicBlock) return null;
		if (this.anthropicBlock.until > this.now()) return this.anthropicBlock;
		this.anthropicBlock = null;
		this.logger.log('Anthropic serves again');
		return null;
	}

	private noteServedBy(choice: LlmModelChoice, model: LlmModelId): void {
		const before = this.servedBy.get(choice);
		if (before === model) return;
		this.servedBy.set(choice, model);
		if (before) this.logger.warn(`${choice} moved from ${before} to ${model}`);
	}
}
