import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import { DurableWorkflow } from 'src/modules/durable-workflows/decorators/durable-workflow.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';

import {
	APIFY_CREDIT_TOPIC,
	APIFY_CREDIT_WAIT_EVENT,
	APIFY_CYCLE_GRACE_SECONDS,
	APIFY_POLL_MS,
} from '../constants/apify.constant.js';
import { type ActorRunRef, ActorRunRequest, ApifyService } from '../services/apify.service.js';
import type { ApifyCreditWait } from '../util/credit-waiters.js';

/**
 * One Apify actor run as a workflow of its own, on the `apify` queue (`APIFY_QUEUE`): started by
 * `ApifyService.runActor` for every caller, shared by callers asking for the same actor and input
 * while it runs (`dedupe`). It governs itself: waits for the account's credit, starts the actor
 * once (re-attaching to a run already paid for after a crash), polls Apify with durable sleeps,
 * stores the items on its `ApifyRun` row and returns only the row's id (`ActorRunRef`), so DBOS
 * never keeps a run's items; `ApifyService.runActor` reads them back for the caller.
 */
@Injectable()
export class ApifyWorkflows {
	private readonly logger = new Logger(ApifyWorkflows.name);

	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly apifyService: ApifyService,
	) {}

	/** The run's result is its record's id and item count; the items are on the record (`ApifyRun.items`) */
	@DurableWorkflow()
	@EnsureRequestContext()
	async runActor(actorId: string, input: object, request: ActorRunRequest): Promise<ActorRunRef> {
		await this.awaitCredit(request.maxCostUsd, request.purpose);
		const started = await this.durable.step('start actor run', () =>
			this.apifyService.startRun(actorId, input, request),
		);
		for (;;) {
			const state = await this.durable.step('poll actor run', () =>
				this.apifyService.pollRun(started.apifyRunId),
			);
			if (state.finished) break;
			await this.durable.sleep(APIFY_POLL_MS);
		}
		return this.durable.step('store actor run', () =>
			this.apifyService.finishRun(started.recordId, actorId),
		);
	}

	/**
	 * Holds the run while what the account has left this cycle (read live, our running runs' caps
	 * counted as spent: `ApifyService.credit`) is short of its cap. It publishes that it waits
	 * (`APIFY_CREDIT_WAIT_EVENT`: its cap and purpose) and sleeps on `APIFY_CREDIT_TOPIC` until the
	 * refresher wakes it (`ApifyCreditSchedule`, or an admin's "wake" after buying credit) or Apify's
	 * cycle ends, then checks again. When the account can't be read the run goes ahead: Apify
	 * enforces the cap anyway.
	 */
	private async awaitCredit(maxCostUsd: number, purpose: string): Promise<void> {
		for (let waits = 0; ; waits++) {
			const credit = await this.durable.step('check credit', () =>
				this.apifyService.creditCheck(),
			);
			if (!credit || credit.remainingUsd >= maxCostUsd) {
				if (waits)
					await this.durable.setEvent<ApifyCreditWait | null>(
						APIFY_CREDIT_WAIT_EVENT,
						null,
					);
				return;
			}
			await this.durable.setEvent<ApifyCreditWait>(APIFY_CREDIT_WAIT_EVENT, {
				needUsd: maxCostUsd,
				purpose,
				since: credit.at,
				until: credit.cycleEnd,
			});
			// The step's stored times, never the clock: a replay waits as the first run did
			const untilCycleEnd = Math.ceil(
				(Date.parse(credit.cycleEnd) - Date.parse(credit.at)) / 1000,
			);
			this.logger.warn(
				`Apify credit: $${credit.remainingUsd.toFixed(2)} left, "${purpose}" needs a cap of $${maxCostUsd}; waiting for credit or the cycle's end (${credit.cycleEnd})`,
			);
			await this.durable.recv<string>(
				APIFY_CREDIT_TOPIC,
				Math.max(60, untilCycleEnd + APIFY_CYCLE_GRACE_SECONDS),
			);
		}
	}
}
