import { EnsureRequestContext } from '@mikro-orm/decorators/legacy';
import { MikroORM } from '@mikro-orm/postgresql';

import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';

import { DurableSchedule } from 'src/modules/durable-workflows/decorators/durable-schedule.decorator.js';
import { DurableStep } from 'src/modules/durable-workflows/decorators/durable-step.decorator.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';

import { APIFY_CREDIT_CHECK_CRON, APIFY_CREDIT_TOPIC } from '../constants/apify.constant.js';
import { ApifyService } from '../services/apify.service.js';
import { wakeableWaiters } from '../util/credit-waiters.js';

/**
 * The credit refresher, every quarter hour. First it closes the runs left RUNNING that no workflow
 * will close (`ApifyService.settleOrphans`), so a dead run's cap stops counting against the credit.
 * Then it looks for actor runs waiting for credit (`ApifyWorkflows.awaitCredit`) and, only when
 * one waits, reads the account and wakes the runs what is left covers (`wakeableWaiters`); each
 * woken run checks again itself. A run nobody wakes wakes by itself when Apify's cycle ends.
 * The settle also runs once at boot: the schedule is deleted where ingestion is off
 * (`INGESTION_IS_DISABLED`), and the credit should be right before the first tick.
 */
@Injectable()
export class ApifyCreditSchedule implements OnApplicationBootstrap {
	private readonly logger = new Logger(ApifyCreditSchedule.name);

	constructor(
		private readonly orm: MikroORM,
		private readonly durable: DurableWorkflowsService,
		private readonly apifyService: ApifyService,
	) {}

	onApplicationBootstrap(): void {
		this.apifyService
			.settleOrphans()
			.then(closed => {
				if (closed) this.logger.log(`Closed ${closed} Apify run(s) no workflow will close`);
			})
			.catch(e => this.logger.warn(`Orphan Apify runs not settled: ${(e as Error).message}`));
	}

	@DurableSchedule('apify-credit-check', APIFY_CREDIT_CHECK_CRON)
	@EnsureRequestContext()
	async check(): Promise<void> {
		await this.settleOrphans();
		// From the body, not a step: DBOS reads an event only from a workflow's body, and records
		// the listing and each event read as steps of their own
		const waiters = await this.apifyService.creditWaiters();
		if (!waiters.length) return;
		const remainingUsd = await this.readCredit();
		// A send is a workflow operation, never inside a step
		for (const waiter of wakeableWaiters(waiters, remainingUsd))
			await this.durable.send(waiter.workflowId, 'credit', APIFY_CREDIT_TOPIC);
	}

	@DurableStep({ name: 'settle orphan runs' })
	private async settleOrphans(): Promise<number> {
		return this.apifyService.settleOrphans();
	}

	@DurableStep({ name: 'read credit' })
	private async readCredit(): Promise<number | null> {
		return this.apifyService.remainingCreditUsd();
	}
}
