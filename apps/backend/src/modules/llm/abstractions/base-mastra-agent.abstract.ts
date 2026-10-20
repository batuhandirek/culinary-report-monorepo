import { Inject, Logger } from '@nestjs/common';

import { Mastra } from '@mastra/core';
import { Agent, AgentExecutionOptions } from '@mastra/core/agent';
import { MastraModelConfig } from '@mastra/core/llm';
import { OutputProcessor } from '@mastra/core/processors';
import { FullOutput } from '@mastra/core/stream';
import { Tool } from '@mastra/core/tools';
import _ from 'lodash';
import type { z, ZodObject } from 'zod/v4';

import { llmConfig } from '../config/llm.config.js';
import { OpenAIAccountsService } from '../services/openai-accounts.service.js';

// NOTE: Mastra's own `MessageListInput` type widens to `any` because some of its
// constituent member types (`@internal/ai-v6`, `@internal_ai-sdk-v4`) are not
// resolvable from this package. We define a strict local shape that covers the
// inputs we actually pass: a plain string, or an array of role-tagged messages
// whose content is either a string or a list of text/image parts.
export type MastraTextPart = { type: 'text'; text: string };
export type MastraImagePart = { type: 'image'; image: string | URL };
export type MastraFilePart = {
	type: 'file';
	data: string | URL;
	mediaType: string;
};
export type MastraContentPart = MastraTextPart | MastraImagePart | MastraFilePart;

export interface MastraMessage {
	role: 'system' | 'user' | 'assistant';
	content: string | MastraContentPart[];
}

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

export interface BaseMastraAgentConfig<Output extends ZodObject> {
	id: string;
	name: string;
	outputSchema: Output;
	defaultExecutionOptions?: MastraExecutionOverrides<Output>;
	verbose?: boolean;
}

export abstract class BaseMastraAgent<
	Output extends ZodObject,
	Context extends object = Record<string, never>,
> {
	@Inject(Mastra) protected readonly mastra!: Mastra;
	@Inject(OpenAIAccountsService) protected readonly openAIAccounts!: OpenAIAccountsService;
	protected abstract readonly config: BaseMastraAgentConfig<Output>;
	private _logger?: Logger;
	protected get logger(): Logger {
		return (this._logger ??= new Logger(this.config.name));
	}

	// Must be implemented by extending classes
	protected abstract getInstructions(context?: Context): string;
	/** An `openai/…` id gets its key from `OpenAIAccountsService` (rotation and failover) */
	protected abstract getModel(context?: Context): MastraModelConfig;

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
		options?: MastraExecutionOverrides<Output>,
	): Promise<FullOutput<z.infer<Output>>> {
		const instructions = this.getInstructions(context);
		const model = this.getModel(context);
		const tools = this.getTools(context);
		const outputProcessors = this.getOutputProcessors(context);

		const mergedOptions = _.merge({}, this.config.defaultExecutionOptions ?? {}, options ?? {});
		const callWith = (resolvedModel: MastraModelConfig) => {
			const agent = new Agent({
				id: this.config.id,
				name: this.config.name,
				instructions,
				model: resolvedModel,
				tools,
				outputProcessors,
				mastra: this.mastra,
			});
			// Per attempt, so a call moved to another account gets the full timeout
			const abortSignal =
				options?.abortSignal ??
				this.config.defaultExecutionOptions?.abortSignal ??
				AbortSignal.timeout(DEFAULT_GENERATE_TIMEOUT_MS);
			return agent.generate<z.infer<Output>>(input, {
				...mergedOptions,
				abortSignal,
				instructions,
				model: resolvedModel,
				structuredOutput: { schema: this.config.outputSchema as any },
			});
		};

		const start = Date.now();
		try {
			const res =
				typeof model === 'string' && model.startsWith('openai/') ?
					await this.openAIAccounts.run(model, account =>
						callWith({ id: model as `openai/${string}`, apiKey: account.apiKey }),
					)
				:	await callWith(model);
			if (llmConfig.IS_LLM_VERBOSE || this.config.verbose) {
				this.logger.debug(
					`Generated in ${Date.now() - start}ms, usage=${JSON.stringify(res.usage)}, result=${JSON.stringify(res.object)}`,
				);
			}
			return res;
		} catch (error) {
			const err = error as Error;
			this.logger.error(`Error during generate: ${err.message}`);
			throw err;
		}
	}
}
