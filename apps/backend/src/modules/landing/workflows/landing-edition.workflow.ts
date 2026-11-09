import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { durableNow } from 'src/modules/durable-workflows/util/durable-steps.js';
import { DurableLlmService } from 'src/modules/llm/services/durable-llm.service.js';
import { withLlmCallContext } from 'src/modules/llm/util/llm-call-context.js';

import { LandingCopyAgent } from '../agents/landing-copy.agent.js';
import { LANDING_QUEUE } from '../queues/landing.queue.js';
import { LandingEditionService, type LandingPlan } from '../services/landing-edition.service.js';
import type { LandingCopyAnswer } from '../util/landing-copy.js';

/** What a build stored: the edition and how its lines came out */
export interface LandingBuildResult {
	editionId: string;
	places: number;
	written: number;
	fallbacks: number;
	copyError: string | null;
	published: boolean;
}

const PURPOSE = 'landing';

/**
 * A city's front page edition as a workflow (the daily `LandingEditionSchedule` for a city whose
 * newest edition is five days old, and an admin's "Build now"), started `high` so its model call
 * passes the reading waiting on the `llm` queue: the clock, the plan step (the counts and the
 * model's message), the `LandingCopyAgent` call as a `DurableLlmService` child that waits until an
 * account can serve it (no account is a wait, never the fallback lines), then the save step. The
 * call's own failure (an answer that doesn't fit, a timeout) still sends the edition out with its
 * plain lines and the reason in `copyError`.
 */
@Injectable()
export class LandingEditionWorkflow {
	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly durableLlm: DurableLlmService,
		private readonly agent: LandingCopyAgent,
		private readonly service: LandingEditionService,
	) {}

	@DurableWorkflow({ name: 'landing-edition.build' })
	@EnsureRequestContext()
	async build(cityId: string): Promise<LandingBuildResult> {
		const now = await durableNow(this.durable);
		const plan = await this.plan(cityId, now.toISOString());
		let answer: LandingCopyAnswer | null = null;
		let copyError: string | undefined;
		if (plan.input)
			try {
				const res = await withLlmCallContext({ cityId, purpose: PURPOSE }, () =>
					this.durableLlm.generate(
						this.agent,
						[{ role: 'user', content: JSON.stringify(plan.input) }],
						{ cityName: plan.cityName },
					),
				);
				answer = res.object as LandingCopyAnswer;
			} catch (error) {
				copyError = ((error as Error).message ?? String(error)).slice(0, 500);
			}
		return this.save(plan, answer, copyError ?? null);
	}

	// ─── Steps: each one domain call, its result stored ───

	@DurableStep({ name: 'plan edition' })
	private async plan(cityId: string, now: string): Promise<LandingPlan> {
		return this.service.plan(cityId, new Date(now));
	}

	@DurableStep({ name: 'save edition' })
	private async save(
		plan: LandingPlan,
		answer: LandingCopyAnswer | null,
		copyError: string | null,
	): Promise<LandingBuildResult> {
		const edition = await this.service.save(plan, answer, copyError ?? undefined);
		return {
			editionId: edition.id,
			places: edition.data.places.length,
			written: edition.copy.written,
			fallbacks: edition.copy.fallbacks,
			copyError: edition.copyError ?? null,
			published: !!edition.publishedAt,
		};
	}
}

/** A city's build on its queue, `high`, one in flight per city: a second start gets the run going */
export const startLandingBuild = (
	durable: Pick<DurableWorkflowsService, 'start'>,
	workflow: Pick<LandingEditionWorkflow, 'build'>,
	cityId: string,
) =>
	durable.start(workflow.build, [cityId], {
		queue: LANDING_QUEUE,
		dedupe: cityId,
		onDuplicate: 'return-existing',
		priority: 'high',
		attributes: { cityId, purpose: PURPOSE },
	});
