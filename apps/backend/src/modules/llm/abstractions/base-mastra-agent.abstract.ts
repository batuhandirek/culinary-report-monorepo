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
import { LlmModelsService } from '../services/llm-models.service.js';

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
}

/** Claude's prompt cache, 5 minutes from each use (a read restarts it) */
const EPHEMERAL = { cacheControl: { type: 'ephemeral' as const } };

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
		this.llmModels.registerAgent(this.config.id);
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
		const choice = chosen ?? this.llmModels.choiceFor(this.config.id, this.getModel(context));
		const tools = this.getTools(context);
		const outputProcessors = this.getOutputProcessors(context);

		const mergedOptions = _.merge({}, this.config.defaultExecutionOptions ?? {}, callOptions);
		const callWith = (resolvedModel: { id: LlmModelId; apiKey: string }) => {
			// Both providers cache the prompt's shared start: the instructions come first, the input
			// after. OpenAI does it by itself (the key routes an agent's calls to the same cache);
			// Claude only up to a marker, put at the end of the instructions
			const claude = providerOf(resolvedModel.id) === 'anthropic';
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
				:	{ openai: { promptCacheKey: this.config.id } };
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
				AbortSignal.timeout(DEFAULT_GENERATE_TIMEOUT_MS);
			return agent.generate<z.infer<Output>>(input, {
				...mergedOptions,
				providerOptions: _.merge(
					{},
					mergedOptions.providerOptions,
					providerOptions,
				) as AgentExecutionOptions['providerOptions'],
				abortSignal,
				instructions: system,
				model: resolvedModel,
				structuredOutput: { schema: this.config.outputSchema as any },
			});
		};

		const start = Date.now();
		try {
			const { result: res, model } = await this.llmModels.run(choice, callWith);
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
			throw err;
		}
	}
}
