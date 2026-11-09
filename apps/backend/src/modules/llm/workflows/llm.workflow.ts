import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import { DURABLE_WORKFLOWS_LOGGER } from 'src/modules/durable-workflows/constants/durable-workflows.constant.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import type { MastraAgentInput } from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import type { LlmModelChoice, LlmModelId } from 'src/modules/llm/constants/llm-models.constant.js';
import {
	LlmModelsService,
	NoModelError,
	type RegisteredAgent,
} from 'src/modules/llm/services/llm-models.service.js';
import { type LlmCallContext, withLlmCallContext } from 'src/modules/llm/util/llm-call-context.js';
import { costUsd, type LlmUsage, usageOf } from 'src/modules/llm/util/llm-cost.js';
import { isFatalProviderError } from 'src/shared/util/pool.js';

/** What an agent call workflow is started with: plain data, stored with the run */
export interface LlmCallOptions {
	/** A model for this call over the agent's own choice */
	model?: LlmModelChoice;
	/** What the ledger files the call under: the caller's call context, carried into the run */
	ledger?: LlmCallContext;
}

/** What a durable call keeps of the answer: small and serializable (the full Mastra output is not) */
export interface DurableGenerateResult<Output = unknown> {
	object: Output;
	text?: string;
	/** The model that answered */
	model: LlmModelId;
	usage: LlmUsage;
	usd: number;
}

type Attempt<Output> =
	| { ok: true; result: DurableGenerateResult<Output> }
	| { ok: false; reason: string; until: number | null };

/** No wait shorter than this: the roster's own blocks are in memory and a restart loses them */
export const MIN_LLM_WAIT_MS = 60_000;
/**
 * The longest one wait: an account's day comes back at 00:00 UTC (`LlmAccountQuotas`), so this
 * only bounds a wait with no end named (a provider switched off, the agent paused), which is
 * checked again after it
 */
export const MAX_LLM_WAIT_MS = 24 * 3_600_000;
/** Spread over this long, so the calls waiting for midnight don't all go at once */
export const LLM_WAKE_JITTER_MS = 90_000;

/**
 * How long a call that found no account waits before it tries again: until the roster's named
 * reset (`LlmAvailability.until`; null, a wait with no end named, waits the longest), at least
 * `MIN_LLM_WAIT_MS`, at most `MAX_LLM_WAIT_MS`, plus jitter
 */
export const llmWaitMs = (until: number | null, now = Date.now()): number => {
	const untilMs = until === null ? MAX_LLM_WAIT_MS : until - now;
	return (
		Math.min(Math.max(untilMs, MIN_LLM_WAIT_MS), MAX_LLM_WAIT_MS) +
		Math.floor(Math.random() * LLM_WAKE_JITTER_MS)
	);
};

/**
 * One agent call as a workflow of its own, on the `llm` queue (`LLM_QUEUE`): started by
 * `DurableLlmService` for any caller. **It always resolves**: when no account can serve it (every
 * one out of its day, the provider blocked, the agent paused) it sleeps until the roster says one
 * can (`agent.availability().until`, the next 00:00 UTC for a daily limit) and tries again, as
 * often as it takes. The call is one checkpointed step, so a resume never asks the model again;
 * to its caller the whole thing is one step. Only the call's own error (an answer that doesn't fit
 * the schema) fails it.
 */
@Injectable()
export class LlmWorkflows {
	private readonly logger = new Logger(DURABLE_WORKFLOWS_LOGGER);

	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly llmModels: LlmModelsService,
	) {}

	@DurableWorkflow()
	@EnsureRequestContext()
	async generate(
		agentId: string,
		input: MastraAgentInput,
		context: object | undefined,
		options: LlmCallOptions = {},
	): Promise<DurableGenerateResult> {
		return this.run(this.agentById(agentId), input, context, options);
	}

	/** The registered agent a run was started for (`LlmModelsService.agent`) */
	agentById(agentId: string): RegisteredAgent {
		const agent = this.llmModels.agent(agentId);
		if (!agent)
			throw new Error(
				`No agent ${agentId} is registered: is it a provider that extends BaseMastraAgent?`,
			);
		return agent;
	}

	/**
	 * The call, waiting for as long as no account can serve it: durably inside a workflow, a plain
	 * timer outside one (DBOS not launched, or inside a caller's step)
	 */
	async run<Output = unknown>(
		agent: RegisteredAgent,
		input: MastraAgentInput,
		context: object | undefined,
		options: LlmCallOptions = {},
	): Promise<DurableGenerateResult<Output>> {
		for (let attempt = 1; ; attempt++) {
			const outcome = await this.durable.step(`llm ${agent.id}`, () =>
				this.attempt<Output>(agent, input, context, options),
			);
			if (outcome.ok) return outcome.result;
			const waitMs = llmWaitMs(outcome.until);
			this.logger.warn(
				`${agent.id}: no account can serve, waiting ${Math.round(waitMs / 60_000)} min (attempt ${attempt}): ${outcome.reason}`,
			);
			await this.wait(waitMs);
		}
	}

	/** A durable sleep in a workflow's body; a plain timer anywhere else, a caller's step included */
	private wait(ms: number): Promise<void> {
		if (this.durable.inWorkflow() && !this.durable.isInStep()) return this.durable.sleep(ms);
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	private async attempt<Output>(
		agent: RegisteredAgent,
		input: MastraAgentInput,
		context: object | undefined,
		options: LlmCallOptions,
	): Promise<Attempt<Output>> {
		const callOptions = options.model ? { model: options.model } : undefined;
		// Still out (a wake-up before the reset): no call, so nothing is filed in the ledger
		const before = agent.availability(context, callOptions);
		if (!before.available) return { ok: false, reason: before.reason, until: before.until };
		try {
			const res = (await withLlmCallContext(options.ledger ?? {}, () =>
				agent.generate(input, context, callOptions),
			)) as {
				object: Output;
				text?: unknown;
				model: LlmModelId;
				totalUsage?: Record<string, unknown>;
				usage?: Record<string, unknown>;
			};
			const usage = usageOf(res);
			return {
				ok: true,
				result: {
					object: res.object,
					text: typeof res.text === 'string' ? res.text : undefined,
					model: res.model,
					usage,
					usd: costUsd(res.model, usage),
				},
			};
		} catch (error) {
			if (!(error instanceof NoModelError) && !isFatalProviderError(error)) throw error;
			// The roster knows when it serves again; read it now, inside the step, while it is fresh
			const after = agent.availability(context, callOptions);
			return {
				ok: false,
				reason: (error as Error).message ?? String(error),
				until: after.available ? Date.now() : after.until,
			};
		}
	}
}
