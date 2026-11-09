import { Inject, Logger, OnModuleInit } from '@nestjs/common';

import { Mastra } from '@mastra/core';
import { Agent, AgentExecutionOptions } from '@mastra/core/agent';
import { OutputProcessor } from '@mastra/core/processors';
import { FullOutput } from '@mastra/core/stream';
import { Tool } from '@mastra/core/tools';
import _ from 'lodash';
import type { z, ZodObject } from 'zod/v4';

import { llmConfig } from '../config/llm.config.js';
import { LlmModelChoice, LlmModelId, providerOf } from '../constants/llm-models.constant.js';
import { LlmAvailability, LlmModelsService } from '../services/llm-models.service.js';
import { costUsd, usageOf } from '../util/llm-cost.js';

// The inputs we pass: a plain string, or role-tagged messages; only a user message carries
// image or file parts
export type MastraTextPart = { type: 'text'; text: string };
export type MastraImagePart = { type: 'image'; image: string | URL };
export type MastraFilePart = {
	type: 'file';
	data: string | URL;
	mediaType: string;
};
export type MastraContentPart = MastraTextPart | MastraImagePart | MastraFilePart;

export type MastraMessage =
	| { role: 'system'; content: string }
	| { role: 'user'; content: string | MastraContentPart[] }
	| { role: 'assistant'; content: string | MastraTextPart[] };

export type MastraAgentInput = string | MastraMessage[];

// Guards against a hung/half-open connection stalling an FSM turn for hours (observed:
// an "other side closed" AI_APICallError surfacing after ~2.8h, well past any sane wait).
// The AI SDK's own retry logic only kicks in once a call actually errors, so without this
// a stalled socket blocks indefinitely.
const DEFAULT_GENERATE_TIMEOUT_MS = 120_000;
/**
 * OpenRouter's free models answer slower and reason first: a long post took over two minutes
 * (cut off, "finish reason aborted", 2026-11-05). Their calls are spaced to the minute's cap anyway,
 * so a slow one only holds its own slot.
 */
const OPENROUTER_GENERATE_TIMEOUT_MS = 360_000;

export type MastraExecutionOverrides<Output extends ZodObject> = Omit<
	AgentExecutionOptions<z.infer<Output>>,
	'structuredOutput' | 'instructions' | 'model'
>;

/** A call's own options; `model` picks the model for this call over the agent's `getModel()` */
export type MastraGenerateOptions<Output extends ZodObject> = MastraExecutionOverrides<Output> & {
	model?: LlmModelChoice;
};

/** The answer, and the model that gave it (the roster may have moved the call) */
export type MastraGenerateResult<Output extends ZodObject> = FullOutput<z.infer<Output>> & {
	model: LlmModelId;
};

export interface BaseMastraAgentConfig<Output extends ZodObject> {
	id: string;
	name: string;
	outputSchema: Output;
	defaultExecutionOptions?: MastraExecutionOverrides<Output>;
	verbose?: boolean;
	/**
	 * A tool-calling agent: each step resends the steps before it, so on Claude the whole
	 * conversation is cached too, not only the instructions. Off for one-shot agents, whose input
	 * is new every call: a cache write there is never read.
	 */
	cacheConversation?: boolean;
	/**
	 * May move to its tier's Claude model when the free one is out, outside `llmPaid` too: only for
	 * agents the user allowed by name (2026-11-03: `aspect-suggestion`, a few dozen short calls
	 * when a run names its groups; `analyst`, whose choice puts Claude first: each answer is a
	 * question an admin asked; 2026-11-09: `post-claims` on Sonnet and `post-gate` on Haiku, the
	 * post reading, since the free allowance reads fewer posts a day than arrive). Its calls wait on
	 * queues of their own (`LLM_PAID_QUEUES`). The spend is capped in the Anthropic Console.
	 */
	paidFallback?: boolean;
	/**
	 * The answer is the model's own text (`res.text`), not an object: a conversational agent whose
	 * answer is prose (the analyst). `outputSchema` is then unused; pass an empty object.
	 */
	freeText?: boolean;
}

/** Claude's prompt cache, 5 minutes from each use (a read restarts it) */
const EPHEMERAL = { cacheControl: { type: 'ephemeral' as const } };

/** A run Mastra handed back without an object: its own error (a provider's, kept as is), else why */
export const failedRunError = (
	res: { error?: unknown; finishReason?: unknown; text?: unknown },
	model: string,
): Error => {
	if (res.error instanceof Error) return res.error;
	const why =
		typeof res.error === 'string' ? res.error
		: res.error && typeof res.error === 'object' && 'message' in res.error ?
			String((res.error as { message: unknown }).message)
		:	`finish reason ${String(res.finishReason ?? 'unknown')}`;
	const text = typeof res.text === 'string' ? res.text.slice(0, 200) : '';
	return new Error(`${model} gave no answer: ${why}${text ? `; it wrote: ${text}` : ''}`);
};

export abstract class BaseMastraAgent<
	Output extends ZodObject,
	Context extends object = Record<string, never>,
> implements OnModuleInit {
	@Inject(Mastra) protected readonly mastra!: Mastra;
	@Inject(LlmModelsService) protected readonly llmModels!: LlmModelsService;
	protected abstract readonly config: BaseMastraAgentConfig<Output>;
	private _logger?: Logger;
	protected get logger(): Logger {
		return (this._logger ??= new Logger(this.config.name));
	}

	onModuleInit(): void {
		this.register();
	}

	/**
	 * Files the agent under its id (`LlmModelsService.agent`), where `LlmWorkflows.generate` finds
	 * it. Also called before DBOS launches (`DurableLlmService.moveCallsToTheirTier`): the global
	 * durable module's init runs before this one, and a recovered run needs its agent.
	 */
	register(): void {
		this.llmModels.registerAgent(this.config.id, this);
	}

	/** The agent's id (`BaseMastraAgentConfig.id`): what the LLM call ledger files its calls under */
	get id(): string {
		return this.config.id;
	}

	/** Whether it may move to Claude when the free models are out (`BaseMastraAgentConfig.paidFallback`): it then has queues of its own */
	get paidFallback(): boolean {
		return this.config.paidFallback ?? false;
	}

	/** The choice a call runs on: the call's own `model`, else the agent's `LLM_AGENT_MODELS` entry, else its `getModel()` */
	modelChoice(context?: Context, options?: { model?: LlmModelChoice }): LlmModelChoice {
		return options?.model ?? this.llmModels.choiceFor(this.config.id, this.getModel(context));
	}

	/**
	 * Whether a call with this context would find a model now, and when the roster serves it again
	 * if not (`LlmModelsService.availability`): what a workflow sleeps on when the allowance is out
	 */
	availability(context?: Context, options?: { model?: LlmModelChoice }): LlmAvailability {
		return this.llmModels.availability(this.modelChoice(context, options), {
			paidFallback: this.config.paidFallback,
		});
	}

	/**
	 * The agent's rules: what the right answer is, model-neutral. What the eval hands its reference
	 * model as the spec, and hashes to tell a reference written under older rules (`ingestion-eval`)
	 */
	rulesFor(context?: Context): string {
		return this.getInstructions(context);
	}

	/** The agent's coaching (`getCoaching`): what an agent composing this one's rules takes as its coaching too */
	coachingFor(context?: Context): string {
		return this.getCoaching(context);
	}

	/** The instructions a call with this context runs on: the rules, then the coaching */
	instructionsFor(context?: Context): string {
		const coaching = this.getCoaching(context);
		const rules = this.getInstructions(context);
		return coaching ? `${rules}\n\n${coaching}` : rules;
	}

	// Must be implemented by extending classes: the rules (`rulesFor`)
	protected abstract getInstructions(context?: Context): string;
	/**
	 * How the model running the agent is coached beyond the rules (emphasis, worked examples, what
	 * it tends to get wrong): changing it changes no right answer, so no reference goes stale and
	 * no reference model ever sees it
	 */
	protected getCoaching(_context?: Context): string {
		return '';
	}
	/**
	 * A tier of the roster (`LLM_ROSTER`: `mini` for volume, `full` for what reaches an owner), or a
	 * model first. `LlmModelsService` picks the model and its key, moving the call on when a
	 * provider can't serve.
	 */
	protected abstract getModel(context?: Context): LlmModelChoice;

	// Might be implemented by extending classes
	protected getTools(_context?: Context): Record<string, Tool> {
		return {};
	}
	protected getOutputProcessors(_context?: Context): OutputProcessor[] {
		return [];
	}

	async generate(
		input: MastraAgentInput,
		context?: Context,
		options?: MastraGenerateOptions<Output>,
	): Promise<MastraGenerateResult<Output>> {
		const instructions = this.instructionsFor(context);
		const { model: chosen, ...callOptions } = options ?? ({} as MastraGenerateOptions<Output>);
		// A call's own choice, else the agent's `LLM_AGENT_MODELS` entry, else its own
		const choice = this.modelChoice(context, { model: chosen });
		const tools = this.getTools(context);
		const outputProcessors = this.getOutputProcessors(context);

		const mergedOptions = _.merge({}, this.config.defaultExecutionOptions ?? {}, callOptions);
		const callWith = async (resolvedModel: { id: LlmModelId; apiKey: string }) => {
			// The providers cache the prompt's shared start: the instructions come first, the input
			// after. OpenAI does it by itself (the key routes an agent's calls to the same cache);
			// Claude only up to a marker, put at the end of the instructions; OpenRouter's free
			// models as their own provider does, with nothing to pass
			const provider = providerOf(resolvedModel.id);
			const claude = provider === 'anthropic';
			const system =
				claude ?
					{
						role: 'system' as const,
						content: instructions,
						providerOptions: { anthropic: EPHEMERAL },
					}
				:	instructions;
			const providerOptions =
				claude ?
					this.config.cacheConversation ?
						{ anthropic: EPHEMERAL }
					:	{}
				: provider === 'openai' ? { openai: { promptCacheKey: this.config.id } }
				: {};
			const agent = new Agent({
				id: this.config.id,
				name: this.config.name,
				instructions: system,
				model: resolvedModel,
				tools,
				outputProcessors,
				mastra: this.mastra,
			});
			// Per attempt, so a call moved to another account or model gets the full timeout
			const abortSignal =
				callOptions.abortSignal ??
				this.config.defaultExecutionOptions?.abortSignal ??
				AbortSignal.timeout(
					provider === 'openrouter' ?
						OPENROUTER_GENERATE_TIMEOUT_MS
					:	DEFAULT_GENERATE_TIMEOUT_MS,
				);
			const res = await agent.generate<z.infer<Output>>(input, {
				...mergedOptions,
				providerOptions: _.merge(
					{},
					mergedOptions.providerOptions,
					providerOptions,
				) as AgentExecutionOptions['providerOptions'],
				abortSignal,
				instructions: system,
				model: resolvedModel,
				// A free-text agent's answer is `res.text`: no structured output at all
				structuredOutput: (this.config.freeText ?
					undefined
				:	{ schema: this.config.outputSchema as any }) as any,
			});
			// Mastra hands some failed runs back instead of throwing (an answer that doesn't fit the
			// schema, a provider that broke off): `error` set, no object. Thrown here, so the roster
			// sees a provider's limit in it and the caller a failed item, never an empty answer
			if (!this.config.freeText && res.object == null)
				throw failedRunError(res, resolvedModel.id);
			return res;
		};

		const start = Date.now();
		try {
			const {
				result: res,
				model,
				account,
			} = await this.llmModels.run(choice, callWith, {
				paidFallback: this.config.paidFallback,
				agentId: this.config.id,
				// What the account's daily token limit counts
				tokensOf: answer => {
					const { inputTokens, outputTokens } = usageOf(answer);
					return inputTokens + outputTokens;
				},
			});
			const usage = usageOf(res);
			this.llmModels.recordCall({
				kind: 'generate',
				agentId: this.config.id,
				model,
				account,
				usage,
				usd: costUsd(model, usage),
				durationMs: Date.now() - start,
				ok: true,
			});
			if (llmConfig.IS_LLM_VERBOSE || this.config.verbose) {
				const usage = res.totalUsage ?? res.usage;
				this.logger.debug(
					`Generated by ${model} in ${Date.now() - start}ms, ${usage?.inputTokens ?? '?'} in (${usage?.cachedInputTokens ?? 0} cached, ${usage?.cacheCreationInputTokens ?? 0} written to cache), ${usage?.outputTokens ?? '?'} out, result=${JSON.stringify(res.object)}`,
				);
			}
			return Object.assign(res, { model });
		} catch (error) {
			const err = error as Error;
			this.logger.error(`Error during generate: ${err.message}`);
			// The roster may have tried several models: none is the call's
			this.llmModels.recordCall({
				kind: 'generate',
				agentId: this.config.id,
				model: null,
				usage: { inputTokens: 0, outputTokens: 0 },
				usd: 0,
				durationMs: Date.now() - start,
				ok: false,
				error: err.message,
			});
			throw err;
		}
	}
}
