import { Logger, OnApplicationBootstrap } from '@nestjs/common';

import {
	isPaidModel,
	LlmModelChoice,
	LlmModelId,
	modelsFor,
	providerOf,
} from '../constants/llm-models.constant.js';
import { isLlmPaid } from '../util/llm-scope.js';
import { accountErrorReason, isProviderAccountError } from '../util/provider-errors.js';
import {
	isOpenAIAccountError,
	NoOpenAIAccountError,
	OpenAIAccountsService,
} from './openai-accounts.service.js';

/** An Anthropic model while Anthropic can't serve: the next model is tried */
const SKIPPED = Symbol('skipped');

/** What a call is made with: the model id and the key of the account serving it */
export interface LlmModelKey {
	id: LlmModelId;
	apiKey: string;
}

export interface LlmModelsOptions {
	openAIAccounts: OpenAIAccountsService;
	/** Unset: the roster's Claude models are left out */
	anthropicApiKey?: string;
	/** Providers left out of the roster (`LLM_DISABLE_OPENAI`, `LLM_DISABLE_ANTHROPIC`) */
	disabled?: { openai?: boolean; anthropic?: boolean };
	/** Agents put on another choice than their own, by agent id (`LLM_AGENT_MODELS`) */
	agentModels?: Record<string, LlmModelChoice>;
	blockMs: number;
	now?: () => number;
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
 * credit is one). Any other error is rethrown as is. When no model is left, the last provider's
 * error is thrown, which `isFatalProviderError` matches.
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
	private readonly disabled: { openai: boolean; anthropic: boolean };
	private readonly agentModels: Record<string, LlmModelChoice>;
	private readonly agents = new Set<string>();
	private readonly blockMs: number;
	private readonly now: () => number;
	private anthropicBlock: { until: number; reason: string } | null = null;
	/** The model that served each choice last, to log a move once instead of per call */
	private readonly servedBy = new Map<string, LlmModelId>();

	constructor(options: LlmModelsOptions) {
		this.openAIAccounts = options.openAIAccounts;
		this.anthropicApiKey = options.anthropicApiKey || undefined;
		this.disabled = {
			openai: options.disabled?.openai ?? false,
			anthropic: options.disabled?.anthropic ?? false,
		};
		this.agentModels = options.agentModels ?? {};
		this.blockMs = options.blockMs;
		this.now = options.now ?? Date.now;
	}

	/** An agent's id, so the boot log can say which `LLM_AGENT_MODELS` entry names no agent */
	registerAgent(id: string): void {
		this.agents.add(id);
	}

	onApplicationBootstrap(): void {
		const off = (['openai', 'anthropic'] as const).filter(p => this.disabled[p]);
		if (off.length) this.logger.warn(`Left out of the roster: ${off.join(', ')}`);
		if (!this.anthropicApiKey) this.logger.log('No ANTHROPIC_API_KEY: Claude is left out');
		for (const [agent, choice] of Object.entries(this.agentModels)) {
			if (!this.agents.has(agent))
				this.logger.error(`LLM_AGENT_MODELS names ${agent}, which is no agent`);
			else if (modelsFor(choice).every(isPaidModel))
				this.logger.error(`LLM_AGENT_MODELS puts ${agent} on ${choice}, which has no free model`);
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
	 * outside `llmPaid` too, behind its free ones.
	 */
	async run<T>(
		choice: LlmModelChoice,
		fn: (model: LlmModelKey) => Promise<T>,
		opts: { paidFallback?: boolean } = {},
	): Promise<{ result: T; model: LlmModelId }> {
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
				const why =
					this.disabled[provider] ? 'disabled'
					: freeOnly && isPaidModel(model) ? 'paid, and only free models run outside llmPaid'
					: provider === 'anthropic' && !this.anthropicApiKey ? 'no ANTHROPIC_API_KEY'
					: provider === 'anthropic' && this.anthropicBlock ?
						`blocked: ${this.anthropicBlock.reason}`
					:	'unavailable';
				return `${model} ${why}`;
			})
			.join('; ');
	}

	/** The Anthropic block in force, for logs and an admin view */
	status(): { anthropic: { until: Date; reason: string } | null } {
		const block = this.blockOfAnthropic();
		return { anthropic: block && { until: new Date(block.until), reason: block.reason } };
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
		throw new Error(`No provider for ${model}`);
	}

	/** The provider can't serve now; blocks Anthropic when it said so */
	private isUnavailable(model: LlmModelId, error: unknown): boolean {
		if (model.startsWith('openai/'))
			return error instanceof NoOpenAIAccountError || isOpenAIAccountError(error);
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

	private blockOfAnthropic(): { until: number; reason: string } | null {
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
