import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import type { WorkflowHandle } from '@dbos-inc/dbos-sdk';

import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { settleHandles } from 'src/modules/durable-workflows/util/durable-steps.js';
import { DurableLlmService } from 'src/modules/llm/services/durable-llm.service.js';
import { withLlmCallContext } from 'src/modules/llm/util/llm-call-context.js';
import type { DurableGenerateResult } from 'src/modules/llm/workflows/llm.workflow.js';

import { type AspectSuggestion, AspectSuggestionAgent } from '../agents/aspect-suggestion.agent.js';
import {
	ASPECT_DISCOVERY_DEDUPE,
	ASPECT_DISCOVERY_QUEUE,
} from '../queues/aspect-discovery.queue.js';
import {
	type AspectDiscoveryResult,
	AspectDiscoveryService,
	type DiscoveryAspects,
	type DiscoveryPlan,
} from '../services/aspect-discovery.service.js';

/** What a run over the cities did, a line per city (each city's own run keeps its groups) */
export interface AspectDiscoveryRunResult {
	dryRun: boolean;
	cities: {
		cityId: string;
		groups: number;
		created: string[];
		refiled: number;
		filed: number;
	}[];
}

const PURPOSE = 'aspect-discovery';

/**
 * Aspect discovery as workflows (`AspectDiscoveryService` holds the work): `runAll` goes over the
 * active cities (the weekly `AspectDiscoverySchedule`: the cron cities), one after another, since
 * an aspect one city creates is in the next one's legend; `discoverCity` is one city's run as its
 * child: the plan step (the loose claims grouped), every group's `AspectSuggestionAgent` call
 * started as a `DurableLlmService` child that waits until an account can serve it, then awaited in
 * order (a call that failed leaves its group unnamed), the aspects created in a step, the claims
 * near them read again in another. A restart resumes after the last finished step; nothing is
 * asked or created twice.
 */
@Injectable()
export class AspectDiscoveryWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly durableLlm: DurableLlmService,
		private readonly agent: AspectSuggestionAgent,
		private readonly service: AspectDiscoveryService,
	) {}

	@DurableWorkflow({ name: 'aspect-discovery.run' })
	@EnsureRequestContext()
	async runAll(opts: { dryRun: boolean; cronOnly?: boolean }): Promise<AspectDiscoveryRunResult> {
		const cityIds = await this.cities(!!opts.cronOnly);
		const cities: AspectDiscoveryRunResult['cities'] = [];
		for (const cityId of cityIds) {
			// A child of this run, one city after another
			const res = await this.discoverCity(cityId, opts.dryRun);
			cities.push({
				cityId,
				groups: res.groups.length,
				created: res.created,
				refiled: res.refiled,
				filed: res.filed,
			});
		}
		return { dryRun: opts.dryRun, cities };
	}

	@DurableWorkflow({ name: 'aspect-discovery.city' })
	@EnsureRequestContext()
	async discoverCity(cityId: string, dryRun: boolean): Promise<AspectDiscoveryResult> {
		return withLlmCallContext({ cityId, purpose: PURPOSE }, async () => {
			const plan = await this.plan(cityId);
			// Every group's call started first, then each awaited in order
			const handles: WorkflowHandle<DurableGenerateResult<AspectSuggestion>>[] = [];
			for (const group of plan.groups)
				handles.push(await this.durableLlm.start(this.agent, group.message, plan.context));
			const answers = (await settleHandles(handles)).map(outcome =>
				outcome.ok ? outcome.value.object : null,
			);
			const aspects = await this.createAspects(plan, answers, dryRun);
			const { refiled, filed } =
				dryRun ? { refiled: 0, filed: 0 } : await this.refile(plan, aspects.refile);
			const result: AspectDiscoveryResult = {
				cityId,
				dryRun,
				claims: plan.claims,
				considered: plan.considered,
				groups: aspects.groups,
				more: plan.more,
				created: aspects.created,
				refiled,
				filed,
			};
			this.service.report(result);
			return result;
		});
	}

	// ─── Steps: each one domain call, its result stored ───

	@DurableStep({ name: 'cities' })
	private async cities(cronOnly: boolean): Promise<string[]> {
		return this.service.cityIds({ cronOnly });
	}

	@DurableStep({ name: 'plan groups' })
	private async plan(cityId: string): Promise<DiscoveryPlan> {
		return this.service.plan(cityId);
	}

	@DurableStep({ name: 'create aspects' })
	private async createAspects(
		plan: DiscoveryPlan,
		answers: (AspectSuggestion | null)[],
		dryRun: boolean,
	): Promise<DiscoveryAspects> {
		return this.service.createAspects(plan, answers, { dryRun });
	}

	@DurableStep({ name: 'refile claims' })
	private async refile(
		plan: DiscoveryPlan,
		refile: DiscoveryAspects['refile'],
	): Promise<{ refiled: number; filed: number }> {
		return this.service.refile(plan, refile);
	}
}

/** A run over the cities on its queue, one in flight: a second start gets the run going */
export const startAspectDiscovery = (
	durable: Pick<DurableWorkflowsService, 'start'>,
	workflow: Pick<AspectDiscoveryWorkflow, 'runAll'>,
	opts: { dryRun: boolean; cronOnly?: boolean },
) =>
	durable.start(workflow.runAll, [opts], {
		queue: ASPECT_DISCOVERY_QUEUE,
		dedupe: ASPECT_DISCOVERY_DEDUPE,
		onDuplicate: 'return-existing',
		attributes: { purpose: PURPOSE },
	});
