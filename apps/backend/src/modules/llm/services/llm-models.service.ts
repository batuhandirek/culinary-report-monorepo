import { Logger, OnApplicationBootstrap } from '@nestjs/common';

import type {
	LlmCallRecord,
	LlmCallRecorder,
} from 'src/modules/llm/interfaces/llm-call-record.interface.js';

import { isKeyed, type KeyedLlmAccount, type LlmAccount } from '../accounts/llm-account.js';
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
import { accountErrorReason, errorChain, isProviderAccountError } from '../util/provider-errors.js';

import { LlmAccountQuotas } from './llm-account-quotas.service.js';
import {
	isOpenAIAccountError,
	NoOpenAIAccountError,
	OpenAIAccountsService,
} from './openai-accounts.service.js';

/** A model whose provider can't serve now (no key, blocked): the next model is tried */
const SKIPPED = Symbol('skipped');

/** A call's answer and the account that gave it */
interface Served<T> {
	result: T;
	account: KeyedLlmAccount;
}

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

/** OpenRouter's free-model requests a minute when its account file names none */
const OPENROUTER_DEFAULT_PER_MINUTE = 20;

export interface LlmModelsOptions {
	openAIAccounts: OpenAIAccountsService;
	/** Claude's account (`anthropic.llm-account.ts`); unset or without a key, Claude is left out */
	anthropic?: LlmAccount;
	/** OpenRouter's account (`openrouter.llm-account.ts`); unset or without a key, its free model is left out */
	openRouter?: LlmAccount;
	/** What each account used of its daily limits (shared with `OpenAIAccountsService`) */
	quotas?: LlmAccountQuotas;
	/** Providers left out of the roster (`LLM_DISABLE_OPENAI`, `…_ANTHROPIC`, `…_OPENROUTER`) */
	disabled?: Partial<Record<LlmProvider, boolean>>;
	/** Agents put on another choice than their own, by agent id (`LLM_AGENT_MODELS`) */
	agentModels?: Record<string, LlmModelChoice>;
	blockMs: number;
	now?: () => number;
	/** How a wait is spent (a test moves its clock instead) */
	sleep?: (ms: number) => Promise<void>;
	/** Where every call is filed (`LlmCallsService`); none, nothing is recorded */
	recorder?: LlmCallRecorder;
}

/**
 * What `LlmWorkflows.generate` needs of an agent, found by id: `BaseMastraAgent` registers itself
 * at init (`registerAgent`), since a workflow's arguments must be plain data, never the agent
 */
export interface RegisteredAgent {
	readonly id: string;
	generate(input: unknown, context?: unknown, options?: unknown): Promise<unknown>;
	availability(context?: unknown, options?: unknown): LlmAvailability;
	/** The choice a call runs on (`BaseMastraAgent.modelChoice`): the call's `model`, else the agent's */
	modelChoice(context?: unknown, options?: { model?: LlmModelChoice }): LlmModelChoice;
	/** It may move to Claude when the free models are out (`BaseMastraAgent.paidFallback`) */
	readonly paidFallback?: boolean;
}

/** Whether a choice can be served now, and if not, when the roster serves it again */
export interface LlmAvailability {
	available: boolean;
	/** When the first blocked model serves again (ms since the epoch); null when none ever will here: none configured, disabled, paused or paid outside `llmPaid` */
	until: number | null;
	reason: string;
}

/**
 * Every model of the choice is left out (disabled, no key, blocked, or paid outside `llmPaid`) or
 * refused the call for its account (out of its day, its credit, its cap; the provider's answer is
 * its `cause`). `isFatalProviderError` matches the message, so a step stops instead of failing
 * item by item, and a durable call waits for the roster's reset instead of failing.
 */
export class NoModelError extends Error {}

/** What the provider itself answered: the first message in the chain from a provider's URL */
const providerWords = (error: unknown): string =>
	errorChain(error).find(e => typeof e.url === 'string' && e.message)?.message ??
	(error as Error)?.message ??
	String(error);

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
 * error is rethrown as is. When no model is left, `NoModelError` is thrown, saying why for each
 * model and what the last provider answered; `isFatalProviderError` matches it, and a durable call
 * waits on it for the roster's reset.
 *
 * A disabled provider is left out, and so are the paid models (Claude) except inside `llmPaid`
 * or for an agent with `paidFallback`: production never pays, except for the few small agents the
 * user allowed, and work the user starts by hand. State is in memory, as the
 * OpenAI blocks are. Built by a factory in `LLMModule` from `llmConfig`.
 */
export class LlmModelsService implements OnApplicationBootstrap {
	private readonly logger = new Logger(LlmModelsService.name);
	private readonly openAIAccounts: OpenAIAccountsService;
	private readonly anthropic?: KeyedLlmAccount;
	private readonly openRouter?: KeyedLlmAccount;
	private readonly quotas: LlmAccountQuotas;
	/** Between two OpenRouter calls' starts */
	private readonly openRouterSpacingMs: number;
	private readonly disabled: Record<LlmProvider, boolean>;
	private readonly agentModels: Record<string, LlmModelChoice>;
	private readonly agents = new Map<string, RegisteredAgent | null>();
	private readonly blockMs: number;
	private readonly now: () => number;
	private readonly sleep: (ms: number) => Promise<void>;
	private readonly recorder?: LlmCallRecorder;
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
		this.anthropic =
			options.anthropic && isKeyed(options.anthropic) ? options.anthropic : undefined;
		this.openRouter =
			options.openRouter && isKeyed(options.openRouter) ? options.openRouter : undefined;
		// 5% under the cap: OpenRouter counts the minute on its side of the network
		this.openRouterSpacingMs = Math.ceil(
			(60_000 / (this.openRouter?.requestsPerMinute ?? OPENROUTER_DEFAULT_PER_MINUTE)) * 1.05,
		);
		this.disabled = {
			openai: options.disabled?.openai ?? false,
			anthropic: options.disabled?.anthropic ?? false,
			openrouter: options.disabled?.openrouter ?? false,
		};
		this.agentModels = options.agentModels ?? {};
		this.blockMs = options.blockMs;
		this.now = options.now ?? Date.now;
		this.sleep = options.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
		this.recorder = options.recorder;
		this.quotas = options.quotas ?? new LlmAccountQuotas({ now: this.now });
	}

	/** Files a call in the ledger (`LlmCallsService`), whatever became of it; a no-op without a recorder */
	recordCall(call: LlmCallRecord): void {
		try {
			this.recorder?.record(call);
		} catch (e) {
			this.logger.warn(`LLM call of ${call.agentId} not recorded: ${(e as Error).message}`);
		}
	}

	/**
	 * Whether `run(choice)` would find a model now, without calling anything, and when the roster
	 * serves the choice again if not: the earliest end of its models' blocks (an OpenAI account's
	 * allowance back at 00:00 UTC, OpenRouter's reset, Anthropic's block). A workflow waiting for
	 * the allowance sleeps until then (`DurableLlmService`).
	 */
	availability(choice: LlmModelChoice, opts: { paidFallback?: boolean } = {}): LlmAvailability {
		const freeOnly = !isLlmPaid() && !opts.paidFallback;
		const models = modelsFor(choice).filter(
			model => !this.disabled[providerOf(model)] && !(freeOnly && isPaidModel(model)),
		);
		const untils: number[] = [];
		const reasons: string[] = [];
		const blockedUntil = (model: LlmModelId, until: number, reason: string) => {
			untils.push(until);
			reasons.push(`${model} until ${new Date(until).toISOString()}: ${reason}`);
		};
		for (const model of models) {
			const provider = providerOf(model);
			if (provider === 'openai') {
				const at = this.openAIAccounts.nextAvailableAt(model);
				if (at === 0) return { available: true, until: 0, reason: '' };
				blockedUntil(
					model,
					at,
					'every OpenAI account is blocked for it or out of its daily limit',
				);
			} else if (provider === 'anthropic') {
				if (!this.anthropic) {
					reasons.push(`${model}: no ANTHROPIC_API_KEY`);
					continue;
				}
				const block = this.blockOfAnthropic(model);
				if (!block) return { available: true, until: 0, reason: '' };
				blockedUntil(model, block.until, block.reason);
			} else {
				if (!this.openRouter) {
					reasons.push(`${model}: no OPENROUTER_AI_API_KEY`);
					continue;
				}
				const block = this.openRouterBlockOf(model);
				if (!block) return { available: true, until: 0, reason: '' };
				blockedUntil(model, block.until, block.reason);
			}
		}
		return {
			available: false,
			until: untils.length ? Math.min(...untils) : null,
			reason: reasons.length ? reasons.join('; ') : `no model configured for ${choice}`,
		};
	}

	/**
	 * An agent, by its id: so the boot log can say which `LLM_AGENT_MODELS` entry names no agent, and
	 * so a workflow given an agent id finds the instance (`LlmWorkflows.generate`)
	 */
	registerAgent(id: string, agent: RegisteredAgent | null = null): void {
		this.agents.set(id, agent);
	}

	/** The registered agent with this id, or undefined */
	agent(id: string): RegisteredAgent | undefined {
		return this.agents.get(id) ?? undefined;
	}

	onApplicationBootstrap(): void {
		const off = (['openai', 'anthropic', 'openrouter'] as const).filter(p => this.disabled[p]);
		if (off.length) this.logger.warn(`Left out of the roster: ${off.join(', ')}`);
		if (!this.anthropic) {
			this.logger.log('No ANTHROPIC_API_KEY: Claude is left out');
		}
		if (!this.openRouter) {
			this.logger.log('No OPENROUTER_AI_API_KEY: OpenRouter is left out');
		}
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
	 * outside `llmPaid` too, behind its free ones. Every call is held by its account's daily limits
	 * (`accounts/*.llm-account.ts`, `LlmAccountQuotas`): an account out of one is skipped as if
	 * blocked until the next 00:00 UTC, and the call is counted against the account that served it
	 * (a request as it starts, `tokensOf` its answer's tokens once it answers). Says which account
	 * served it, for the ledger.
	 */
	async run<T>(
		choice: LlmModelChoice,
		fn: (model: LlmModelKey) => Promise<T>,
		opts: {
			paidFallback?: boolean;
			agentId?: string;
			tokensOf?: (result: T) => number;
		} = {},
	): Promise<{ result: T; model: LlmModelId; account: string }> {
		const freeOnly = !isLlmPaid() && !opts.paidFallback;
		const models = modelsFor(choice).filter(
			model => !this.disabled[providerOf(model)] && !(freeOnly && isPaidModel(model)),
		);
		let lastError: unknown;
		for (const model of models) {
			try {
				const served = await this.runOn(model, fn);
				if (served === SKIPPED) continue;
				this.noteServedBy(choice, model);
				if (opts.tokensOf)
					this.quotas.addTokens(served.account, model, opts.tokensOf(served.result));
				return { result: served.result, model, account: served.account.id };
			} catch (error) {
				if (!this.isUnavailable(model, error)) throw error;
				lastError = error;
			}
		}
		// Always `NoModelError`, never the last provider's own error: a durable call waits on it,
		// whatever words the provider used (OpenRouter's daily cap matches nothing else)
		const why = `No model can serve ${choice}: ${this.whyNone(choice, freeOnly)}`;
		throw new NoModelError(lastError ? `${why} (last answer: ${providerWords(lastError)})` : why, {
			cause: lastError,
		});
	}

	/** Why each model of the choice is left out, so the fatal error says what to fix or wait for */
	private whyNone(choice: LlmModelChoice, freeOnly: boolean): string {
		const blocked = (block: Block | null): string | null => block && `blocked: ${block.reason}`;
		return modelsFor(choice)
			.map(model => {
				const provider = providerOf(model);
				const why =
					this.disabled[provider] ? 'disabled'
					: freeOnly && isPaidModel(model) ?
						'paid, and only free models run outside llmPaid'
					: provider === 'openai' ?
						'every OpenAI account is blocked for it or out of its daily limit'
					: provider === 'anthropic' ?
						!this.anthropic ?
							'no ANTHROPIC_API_KEY'
						:	(blocked(this.blockOfAnthropic(model)) ?? 'unavailable')
					: !this.openRouter ? 'no OPENROUTER_AI_API_KEY'
					: (blocked(this.openRouterBlockOf(model)) ?? 'unavailable');
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
			anthropic: shown(this.anthropicBlockNow()),
			openrouter: shown(this.activeBlock(this.openRouterBlock)),
		};
	}

	/** Every account's daily limits with what it used today */
	quotaUsage(accounts: readonly LlmAccount[]): ReturnType<LlmAccountQuotas['usage']> {
		return this.quotas.usage(accounts);
	}

	private async runOn<T>(
		model: LlmModelId,
		fn: (model: LlmModelKey) => Promise<T>,
	): Promise<Served<T> | typeof SKIPPED> {
		if (model.startsWith('openai/')) {
			let served: KeyedLlmAccount | undefined;
			const result = await this.openAIAccounts.run(model, account => {
				served = account;
				return fn({ id: model, apiKey: account.apiKey });
			});
			return { result, account: served! };
		}
		if (model.startsWith('anthropic/')) {
			const account = this.anthropic;
			if (!account || this.blockOfAnthropic(model)) return SKIPPED;
			this.quotas.begin(account, model);
			return { result: await fn({ id: model, apiKey: account.apiKey }), account };
		}
		if (model.startsWith('openrouter/')) return this.runOnOpenRouter(model, fn);
		throw new Error(`No provider for ${model}`);
	}

	/**
	 * One call on OpenRouter: spaced to the per-minute cap, a short block waited out and the call
	 * tried again (up to `OPENROUTER_TRIES`), a long one (the day's free requests used up) skipped.
	 * The limit an error names is recorded here; `isUnavailable` then moves the call on. Every try
	 * counts as a request of the account's day: OpenRouter counts failed ones too.
	 */
	private async runOnOpenRouter<T>(
		model: LlmModelId,
		fn: (model: LlmModelKey) => Promise<T>,
	): Promise<Served<T> | typeof SKIPPED> {
		const account = this.openRouter;
		if (!account) return SKIPPED;
		const apiKey = account.apiKey;
		for (let attempt = 1; ; attempt++) {
			const block = this.openRouterBlockOf(model);
			if (block) {
				const wait = block.until - this.now();
				if (wait > OPENROUTER_MAX_WAIT_MS) return SKIPPED;
				await this.sleep(wait);
			}
			await this.openRouterTurn();
			// Its day may have run out while the call waited for its turn
			if (this.quotas.blockOf(account, model)) return SKIPPED;
			this.quotas.begin(account, model);
			try {
				return { result: await fn({ id: model, apiKey }), account };
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

	/**
	 * The block an OpenRouter model is under: the account's (its own daily limit, or a limit
	 * OpenRouter answered with) or the model's, whichever ends latest
	 */
	private openRouterBlockOf(model: LlmModelId): Block | null {
		const blocks = [
			this.activeBlock(this.openRouterBlock),
			this.activeBlock(this.openRouterModelBlocks.get(model) ?? null),
			this.openRouter ? this.quotas.blockOf(this.openRouter, model) : null,
		].filter((b): b is Block => b !== null);
		return blocks.reduce<Block | null>((a, b) => (!a || b.until > a.until ? b : a), null);
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
		if (!this.anthropicBlockNow()) {
			this.logger.warn(`Anthropic blocked until ${new Date(until).toISOString()}: ${reason}`);
		}
		this.anthropicBlock = { until, reason };
		return true;
	}

	/** Claude's block for `model`: the one Anthropic answered with, else its account's daily limit */
	private blockOfAnthropic(model: LlmModelId): Block | null {
		return (
			this.anthropicBlockNow() ??
			(this.anthropic ? this.quotas.blockOf(this.anthropic, model) : null)
		);
	}

	private anthropicBlockNow(): Block | null {
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
