import { Injectable, Logger } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';

import type { WorkflowHandle } from '@dbos-inc/dbos-sdk';
import type { z, ZodObject } from 'zod/v4';

import { DURABLE_WORKFLOWS_LOGGER } from 'src/modules/durable-workflows/constants/durable-workflows.constant.js';
import { BeforeDurableLaunch } from 'src/modules/durable-workflows/decorators/before-durable-launch.decorator.js';
import type { DurableQueue } from 'src/modules/durable-workflows/interfaces/durable-workflows.interface.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import {
	BaseMastraAgent,
	type MastraAgentInput,
} from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';
import { currentLlmCallContext } from 'src/modules/llm/util/llm-call-context.js';
import { isFatalProviderError } from 'src/shared/util/pool.js';

import { type LlmModelChoice, tierOf } from '../constants/llm-models.constant.js';
import { LLM_GENERATE_WORKFLOW } from '../constants/llm-workflows.constant.js';
import { LLM_QUEUES } from '../queues/llm.queue.js';
import {
	type LlmAvailability,
	LlmModelsService,
	NoModelError,
} from '../services/llm-models.service.js';
import {
	type DurableGenerateResult,
	type LlmCallOptions,
	llmWaitMs,
	LlmWorkflows,
} from '../workflows/llm.workflow.js';

/** What waiting for an account needs of an agent: its id, and when the roster serves it again */
export interface LlmServed {
	readonly id: string;
	availability(context?: unknown, options?: { model?: LlmModelChoice }): LlmAvailability;
}

/** What picking a call's queue needs of an agent: the choice its calls run on */
interface LlmChooser {
	modelChoice(context?: never, options?: { model?: LlmModelChoice }): LlmModelChoice;
}

/** A wait for an account, as `untilServed` tells it (an event a page reads) */
export interface LlmWait {
	/** The first agent of the list no account can serve */
	agentId: string;
	reason: string;
	/** When the roster says it serves again (ISO); null when it names no end */
	until: string | null;
	/** When the run looks again (ISO) */
	wakeAt: string;
}

/** The tag a call's own `model` is kept under, so a boot can tell which tier's queue the run belongs on */
const MODEL_ATTRIBUTE = 'model';

/**
 * An agent call as a durable workflow: `generate` starts `LlmWorkflows.generate` on its tier's
 * queue (`LLM_QUEUES`: one step to a calling workflow, a run of its own to anyone else) and awaits its result,
 * which always comes: where the plain call throws "no model can serve", this one waits until an
 * account can. The caller's call context travels with the run, so the ledger files the call
 * right. Without DBOS (the eval CLI) or inside a step it is the plain call, waiting on a timer.
 */
@Injectable()
export class DurableLlmService {
	private readonly logger = new Logger(DURABLE_WORKFLOWS_LOGGER);

	constructor(
		private readonly durable: DurableWorkflowsService,
		private readonly llmWorkflows: LlmWorkflows,
		private readonly llmModels: LlmModelsService,
		private readonly modules: ModulesContainer,
	) {}

	/** Every agent Nest built, filed under its id now (each does it again in its own `onModuleInit`) */
	private registerAgents(): void {
		for (const module of this.modules.values())
			for (const wrapper of module.providers.values())
				if (wrapper.instance instanceof BaseMastraAgent) wrapper.instance.register();
	}

	/** The queue a call waits on: its tier's (`LLM_QUEUES`), from the call's own `model` or the agent's choice */
	queueFor(agent: LlmChooser, model?: LlmModelChoice): DurableQueue {
		return LLM_QUEUES[tierOf(agent.modelChoice(undefined, model ? { model } : undefined))];
	}

	/**
	 * At boot, before DBOS recovers anything: every live call on a tier's queue that belongs on
	 * another moves there (the runs from before the queues were split, and an agent moved to another
	 * tier by `LLM_AGENT_MODELS` or its `getModel`). A sleeping run keeps its wake-up time. A run
	 * whose agent is not registered stays. The agents are registered here first: Nest runs the
	 * global durable module's init before theirs.
	 */
	@BeforeDurableLaunch()
	async moveCallsToTheirTier(): Promise<void> {
		this.registerAgents();
		for (const queue of Object.values(LLM_QUEUES)) {
			const moved = await this.durable.moveRuns(queue, run => {
				if (run.className !== LLM_GENERATE_WORKFLOW.className) return undefined;
				if (run.workflowName !== LLM_GENERATE_WORKFLOW.name) return undefined;
				const agent = this.llmModels.agent(String(run.attributes.agentId ?? ''));
				if (!agent) return undefined;
				const model = run.attributes[MODEL_ATTRIBUTE];
				return this.queueFor(
					agent,
					typeof model === 'string' ? (model as LlmModelChoice) : undefined,
				);
			});
			for (const [to, count] of Object.entries(moved))
				this.logger.log(`Moved ${count} agent call(s) from queue ${queue.name} to ${to}`);
		}
	}

	/**
	 * Starts the call as a workflow and hands back its handle, for a caller that fans out (start
	 * every call, then await each result in order). Inside a step, or without DBOS, the call runs
	 * inline, behind a handle all the same.
	 */
	async start<Output extends ZodObject, Context extends object>(
		agent: BaseMastraAgent<Output, Context>,
		input: MastraAgentInput,
		context?: Context,
		options: Omit<LlmCallOptions, 'ledger'> = {},
	): Promise<WorkflowHandle<DurableGenerateResult<z.infer<Output>>>> {
		const ledger = currentLlmCallContext();
		const request: LlmCallOptions = { ...options, ledger };
		if (!this.durable.isLaunched() || this.durable.isInStep()) {
			const result = this.llmWorkflows.run<z.infer<Output>>(agent, input, context, request);
			return { workflowID: '', getResult: () => result, getStatus: async () => null };
		}
		return this.durable.enqueue<DurableGenerateResult<z.infer<Output>>>(
			LLM_GENERATE_WORKFLOW,
			[agent.id, input, context, request],
			{
				queue: this.queueFor(agent, options.model),
				attributes: {
					agentId: agent.id,
					...(options.model && { [MODEL_ATTRIBUTE]: options.model }),
					...(ledger.cityId && { cityId: ledger.cityId }),
					...(ledger.purpose && { purpose: ledger.purpose }),
				},
			},
		);
	}

	/**
	 * The agent with its calls made through this service (`generate`, `start`), for code written
	 * against an agent's shape: `readPostClaims(durableLlm.as(agent), …)` reads a post with every
	 * call a child workflow that waits for an account.
	 */
	as<Output extends ZodObject, Context extends object>(agent: BaseMastraAgent<Output, Context>) {
		return {
			generate: (
				input: MastraAgentInput,
				context?: Context,
				options: Omit<LlmCallOptions, 'ledger'> = {},
			) => this.generate(agent, input, context, options),
			start: (
				input: MastraAgentInput,
				context?: Context,
				options: Omit<LlmCallOptions, 'ledger'> = {},
			) => this.start(agent, input, context, options),
		};
	}

	/** `start` and the result: one call, awaited */
	async generate<Output extends ZodObject, Context extends object>(
		agent: BaseMastraAgent<Output, Context>,
		input: MastraAgentInput,
		context?: Context,
		options: Omit<LlmCallOptions, 'ledger'> = {},
	): Promise<DurableGenerateResult<z.infer<Output>>> {
		return (await this.start(agent, input, context, options)).getResult();
	}

	/**
	 * An agent call made inline, waiting for an account instead of failing when none can serve:
	 * for a call no child workflow can carry (an agent given in-memory tools, a caller reading
	 * Mastra's whole result: the report's agents). `call` is tried; when it throws `NoModelError`
	 * or a provider's fatal error (`isFatalProviderError`) the wait is until the roster's named
	 * reset (`agent.availability`, `llmWaitMs`), then it is tried again, as often as it takes. Any
	 * other error (an answer that doesn't fit, a timeout) is the caller's. `call` builds its own
	 * per-try state (a fresh `AbortSignal.timeout`, a fresh `ToolRun`). A durable sleep in a
	 * workflow's body, a timer anywhere else: inside a step the step is the checkpoint, and a
	 * restart runs the step, and so the call, again.
	 */
	async whenServed<T>(
		agent: LlmServed,
		call: () => Promise<T>,
		options: { context?: unknown; model?: LlmModelChoice } = {},
	): Promise<T> {
		for (let attempt = 1; ; attempt++) {
			try {
				return await call();
			} catch (error) {
				if (!(error instanceof NoModelError) && !isFatalProviderError(error)) throw error;
				const now = agent.availability(
					options.context,
					options.model ? { model: options.model } : undefined,
				);
				const waitMs = llmWaitMs(now.available ? Date.now() : now.until);
				this.logger.warn(
					`${agent.id}: no account can serve, waiting ${Math.round(waitMs / 60_000)} min (attempt ${attempt}): ${(error as Error).message ?? String(error)}`,
				);
				await this.sleep(waitMs);
			}
		}
	}

	/**
	 * In a workflow's body, before a step whose agent calls run inline (`whenServed`): returns
	 * once an account can serve every one of `agents`, sleeping durably until the roster's named
	 * reset otherwise, so a restart resumes the wait and runs nothing twice. Each check is a step.
	 * `onWait` hears each wait (`LlmWait`) and, once served after one, `null`: a page shows the
	 * wait through `setEvent`. Outside a workflow's body it checks and waits plainly.
	 */
	async untilServed(
		agents: LlmServed[],
		onWait?: (wait: LlmWait | null) => Promise<void>,
	): Promise<void> {
		let waited = false;
		for (;;) {
			const blocked = await this.durable.step(
				'llm accounts',
				async (): Promise<(LlmWait & { waitMs: number }) | null> => {
					for (const agent of agents) {
						const now = agent.availability();
						if (now.available) continue;
						const waitMs = llmWaitMs(now.until);
						return {
							agentId: agent.id,
							reason: now.reason,
							until: now.until === null ? null : new Date(now.until).toISOString(),
							wakeAt: new Date(Date.now() + waitMs).toISOString(),
							waitMs,
						};
					}
					return null;
				},
			);
			if (!blocked) {
				if (waited) await onWait?.(null);
				return;
			}
			const { waitMs, ...wait } = blocked;
			this.logger.warn(
				`${wait.agentId}: no account can serve, waiting ${Math.round(waitMs / 60_000)} min before the work: ${wait.reason}`,
			);
			await onWait?.(wait);
			waited = true;
			await this.sleep(waitMs);
		}
	}

	/** A durable sleep in a workflow's body; a timer anywhere else, a caller's step included */
	protected sleep(ms: number): Promise<void> {
		if (this.durable.inWorkflow() && !this.durable.isInStep()) return this.durable.sleep(ms);
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}
