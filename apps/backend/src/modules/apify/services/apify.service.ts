import { Injectable, Logger } from '@nestjs/common';

import type { WorkflowHandle } from '@dbos-inc/dbos-sdk';
import { ApifyClient } from 'apify-client';
import { createHash } from 'node:crypto';

import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';

import { apifyConfig } from '../config/apify.config.js';
import {
	APIFY_CREDIT_TOPIC,
	APIFY_CREDIT_WAIT_EVENT,
	APIFY_RUN_ACTOR_WORKFLOW,
} from '../constants/apify.constant.js';
import { ApifyRun, ApifyRunStatusEnum } from '../entities/apify-run.entity.js';
import { SettleApifyRunCostJob } from '../jobs/settle-apify-run-cost.job.js';
import { APIFY_QUEUE } from '../queues/apify.queue.js';
import { ApifyRunRepository } from '../repositories/apify-run.repository.js';
import {
	type ApifyCreditWait,
	type ApifyCreditWaiter,
	wakeableWaiters,
} from '../util/credit-waiters.js';
import { planLimitNote } from '../util/plan-cap.js';
import { processShutdown } from '../util/process-shutdown.js';

/**
 * How long after a run its cost is read again. Apify settles usage late: a run read $0.0008
 * eight seconds after it ended and $0.037 half a minute later.
 */
export const COST_SETTLE_DELAY_SECONDS = 180;

export interface RunActorOptions {
	/** Hard cap enforced by Apify for pay-per-event actors. */
	maxCostUsd: number;
	/** What the run is for, shown on the admin pipeline page. */
	purpose: string;
	/** Memory for the run in MB; the actor's default without. Lower lets more runs share the plan's 16 GB */
	memoryMbytes?: number;
	/**
	 * The workflow whose work the run is: the operation that asked for it (an atom passes its
	 * caller's), else the workflow calling `runActor`. Stored on the row, so the Data page's spend
	 * per month finds a run that is a child's child of the operation's run.
	 */
	ownerWorkflowId?: string;
}

/** How long a start refused for the plan's memory waits before trying again, and how often. */
export const MEMORY_RETRY_SECONDS = 30;
export const MEMORY_RETRIES = 20;

/** Apify's run statuses that are still moving; every other one is final */
const RUN_IN_PROGRESS = ['READY', 'RUNNING', 'TIMING-OUT', 'ABORTING'];

/** DBOS statuses of a workflow still going or yet to start: the run it holds is its own to close */
const LIVE_WORKFLOW_STATUSES = ['PENDING', 'ENQUEUED', 'DELAYED'];

/** Why a RUNNING row has no workflow left to close it, for its `error` */
function orphanReason(workflowId: string | null | undefined, status: string | undefined): string {
	if (!workflowId) return 'no workflow owns it';
	if (!status) return `its workflow ${workflowId} is gone`;
	if (status === 'CANCELLED') return `its workflow ${workflowId} was cancelled`;
	if (status === 'SUCCESS') return `its workflow ${workflowId} ended without them`;
	return `its workflow ${workflowId} failed (${status})`;
}

/** Apify refused to start a run because the account's runs already use the plan's memory. */
export const isMemoryLimitError = (error: unknown): boolean =>
	/exceed the memory limit/i.test((error as { message?: string } | undefined)?.message ?? '');

/** The same actor and input, whatever the order of the input's keys. */
export function hashActorInput(actorId: string, input: object): string {
	const stable = (value: unknown): unknown =>
		Array.isArray(value) ? value.map(stable)
		: value && typeof value === 'object' ?
			Object.fromEntries(
				Object.keys(value)
					.sort()
					.map(key => [key, stable((value as Record<string, unknown>)[key])]),
			)
		:	value;
	return createHash('sha256')
		.update(JSON.stringify([actorId, stable(input)]))
		.digest('hex');
}

/** The Apify account now (`ApifyService.credit`) */
export interface ApifyCredit {
	/** The cycle's usage limit, in USD */
	limitUsd: number;
	/** What the account used this cycle, as Apify counts it */
	usedUsd: number;
	cycleStart: Date;
	cycleEnd: Date;
	/** Our runs still going, and their caps together: counted as spent until they end */
	runningRuns: number;
	runningCapsUsd: number;
	/** What new runs may still spend: limit − used − running caps */
	remainingUsd: number;
	readAt: Date;
}

/** What the actor-run workflow returns: the record holding the items, never the items themselves */
export interface ActorRunRef {
	recordId: string;
	itemCount: number;
}

/** What one actor run child workflow is started with (`ApifyWorkflows.runActor`) */
export type ActorRunRequest = RunActorOptions;

/**
 * An actor run asked for outside a workflow's body (plain code, a step, or DBOS not launched):
 * every run is a child workflow (`ApifyWorkflows.runActor`), so a caller plans its runs in a step
 * and starts them from its body (`runActorCall`, `startActorCall`).
 */
export class ActorRunOutsideWorkflowError extends Error {
	constructor(actorId: string, purpose: string) {
		super(
			`${actorId} for "${purpose}" was asked for outside a workflow's body: an actor run is a child workflow, started from a workflow's body with DBOS launched`,
		);
		this.name = 'ActorRunOutsideWorkflowError';
	}
}

/**
 * The one way to run an Apify actor. Every run is recorded as an `ApifyRun` with its cost,
 * and carries a spending cap Apify enforces, so no step can overspend the monthly credit.
 *
 * With DBOS launched, `runActor` starts the `ApifyWorkflows.runActor` child workflow on the
 * `apify` queue and awaits its result: the run governs itself (the credit waited for, the actor
 * started once, Apify polled with durable sleeps, the items stored), survives a deploy, is
 * throttled by the queue with every other run, and two callers asking for the same actor and
 * input while one runs share it (`dedupe`). Without DBOS (the eval CLI) the run happens inline.
 * `startRun`, `pollRun` and `finishRun` are the workflow's steps; nothing else calls them.
 */
@Injectable()
export class ApifyService {
	private readonly logger = new Logger(ApifyService.name);
	private client?: ApifyClient;
	// Overridden by tests
	memoryRetryMs = MEMORY_RETRY_SECONDS * 1000;

	constructor(
		private readonly apifyRunRepository: ApifyRunRepository,
		private readonly pgBossService: PgBossService,
		private readonly durable: DurableWorkflowsService,
	) {}

	private getClient(): ApifyClient {
		if (this.client) return this.client;
		if (!apifyConfig.APIFY_TOKEN) throw new Error('APIFY_TOKEN is not set');
		return (this.client = new ApifyClient({ token: apifyConfig.APIFY_TOKEN }));
	}

	/**
	 * Runs the actor to the end and returns every item of its dataset: `runActorRef`, then the
	 * items read back from the run's row (`storedItems`).
	 */
	async runActor<T = Record<string, unknown>>(
		actorId: string,
		input: object,
		options: RunActorOptions,
	): Promise<T[]> {
		const { recordId } = await this.runActorRef(actorId, input, options);
		return this.storedItems<T>(recordId);
	}

	/**
	 * Runs the actor to the end and returns its run's record (`ActorRunRef`), never the items: a
	 * caller that stores them in a step of its own (an atom) reads them there with `storedItems`.
	 * The run is the `ApifyWorkflows.runActor` child workflow (see the class comment), so it is
	 * started from a workflow's body with DBOS launched, never from inside a step or plain code
	 * (`ActorRunOutsideWorkflowError`). The row's owner is the workflow that asked for the run
	 * (`options.ownerWorkflowId`, else the calling workflow).
	 */
	async runActorRef(
		actorId: string,
		input: object,
		options: RunActorOptions,
	): Promise<ActorRunRef> {
		return (await this.startActorRef(actorId, input, options)).getResult();
	}

	/**
	 * `runActorRef` as a start: the child's handle, for a fan-out from a workflow's body (every run
	 * started first, then awaited in order, `settleHandles`).
	 */
	async startActorRef(
		actorId: string,
		input: object,
		options: RunActorOptions,
	): Promise<WorkflowHandle<ActorRunRef>> {
		if (!this.durable.isLaunched() || this.durable.isInStep())
			throw new ActorRunOutsideWorkflowError(actorId, options.purpose);
		return this.enqueueRun(actorId, input, options);
	}

	/** The run as a child workflow on the `apify` queue (see the class comment), shared by callers asking for the same input */
	private async enqueueRun(
		actorId: string,
		input: object,
		options: RunActorOptions,
	): Promise<WorkflowHandle<ActorRunRef>> {
		const ownerWorkflowId = options.ownerWorkflowId ?? this.durable.workflowId() ?? null;
		const request: ActorRunRequest = {
			...options,
			...(ownerWorkflowId ? { ownerWorkflowId } : {}),
		};
		return this.durable.enqueue<ActorRunRef>(
			APIFY_RUN_ACTOR_WORKFLOW,
			[actorId, input, request],
			{
				queue: APIFY_QUEUE,
				// The same actor and input while one runs is one run, shared by its callers
				dedupe: `${actorId}:${hashActorInput(actorId, input)}`,
				onDuplicate: 'return-existing',
				attributes: { actorId, purpose: options.purpose },
			},
		);
	}

	// ─── The child workflow's steps (`ApifyWorkflows.runActor`) ───

	/**
	 * The workflow's first step: starts the actor, or re-attaches to the run this very step started
	 * before a crash cut the workflow short (the child's own id and step, the same input).
	 */
	async startRun(
		actorId: string,
		input: object,
		{ maxCostUsd, purpose, memoryMbytes, ownerWorkflowId }: ActorRunRequest,
	): Promise<{ recordId: string; apifyRunId: string }> {
		const client = this.getClient();
		const em = this.apifyRunRepository.getEntityManager().fork();
		const inputHash = hashActorInput(actorId, input);
		const workflowId = this.durable.workflowId() ?? null;
		const workflowStepId = this.durable.stepId() ?? null;
		const earlier =
			workflowId ?
				await em.findOne(
					ApifyRun,
					{
						workflowId,
						workflowStepId,
						actorId,
						inputHash,
						apifyRunId: { $ne: null },
						status: { $ne: ApifyRunStatusEnum.FAILED },
					},
					{ orderBy: { createdAt: 'desc' } },
				)
			:	null;
		if (earlier?.apifyRunId) {
			this.logger.log(
				`Re-attaching to ${actorId} run ${earlier.apifyRunId} for "${purpose}" (workflow ${workflowId})`,
			);
			earlier.status = ApifyRunStatusEnum.RUNNING;
			earlier.workflowId = workflowId;
			earlier.workflowStepId = workflowStepId;
			await em.flush();
			return { recordId: earlier.id, apifyRunId: earlier.apifyRunId };
		}
		const record = em.create(ApifyRun, {
			actorId,
			purpose,
			maxCostUsd,
			status: ApifyRunStatusEnum.RUNNING,
			inputHash,
			workflowId,
			workflowStepId,
			ownerWorkflowId: ownerWorkflowId ?? null,
		});
		await em.flush();
		this.logger.log(
			`Starting ${actorId} for "${purpose}" (cap $${maxCostUsd}, workflow ${workflowId})`,
		);
		try {
			const started = await this.startWhenMemoryFrees(() =>
				client.actor(actorId).start(input, {
					maxTotalChargeUsd: maxCostUsd,
					...(memoryMbytes && { memory: memoryMbytes }),
				}),
			);
			record.apifyRunId = started.id;
			await em.flush();
			return { recordId: record.id, apifyRunId: started.id };
		} catch (e) {
			record.status = ApifyRunStatusEnum.FAILED;
			record.error = (e as Error).message;
			record.finishedAt = new Date();
			await em.flush();
			throw e;
		}
	}

	/** Whether Apify says the run is over (any final status) */
	async pollRun(apifyRunId: string): Promise<{ status: string; finished: boolean }> {
		const run = await this.getClient().run(apifyRunId).get();
		if (!run) throw new Error(`Apify knows no run ${apifyRunId}`);
		return { status: run.status, finished: !RUN_IN_PROGRESS.includes(run.status) };
	}

	/** Reads the finished run's items and cost into the record; the workflow's result is the record's id */
	async finishRun(recordId: string, actorId: string): Promise<ActorRunRef> {
		const client = this.getClient();
		const em = this.apifyRunRepository.getEntityManager().fork();
		const record = await em.findOneOrFail(ApifyRun, recordId);
		try {
			const run = await client.run(record.apifyRunId!).get();
			if (!run) throw new Error(`Apify knows no run ${record.apifyRunId}`);
			record.costUsd = run.usageTotalUsd ?? record.costUsd ?? null;
			const items = await this.listItems<unknown>(client, run.defaultDatasetId);
			this.closeRecord(
				record,
				run.status,
				items.length,
				planLimitNote(run.statusMessage, await this.readLog(client, run.id)),
				actorId,
			);
			record.items = items;
			await em.flush();
			return { recordId: record.id, itemCount: items.length };
		} catch (e) {
			record.status = ApifyRunStatusEnum.FAILED;
			record.error = (e as Error).message;
			record.finishedAt = new Date();
			await em.flush();
			throw e;
		} finally {
			await this.queueSettle(record.id);
		}
	}

	/** A finished run's items, as `finishRun` stored them (none for a run that stored nothing) */
	async storedItems<T>(recordId: string): Promise<T[]> {
		const [row]: { items: T[] | null }[] = await this.apifyRunRepository
			.getEntityManager()
			.getConnection()
			.execute(`select items from apify_runs where id = ?`, [recordId]);
		return row?.items ?? [];
	}

	// ─── Runs no workflow will close ───

	/**
	 * Closes the runs left RUNNING that no workflow will close: one no workflow owns (started before
	 * durable workflows), or whose workflow was cancelled, failed or is gone. Each takes Apify's own
	 * outcome and cost, its items not stored (nothing would save them now); one Apify still runs is
	 * left until it ends, its cap rightly counted while it spends. A run whose workflow is still
	 * going is that workflow's: a restart resumes it, polling on from its last step. Without this a
	 * dead run's whole cap counts against the credit (`credit`) for good. Run by the credit refresher
	 * every quarter hour and once at boot (`ApifyCreditSchedule`); the number of rows it closed.
	 */
	async settleOrphans(): Promise<number> {
		if (!this.durable.isLaunched()) return 0;
		const em = this.apifyRunRepository.getEntityManager().fork();
		const running = await em.find(ApifyRun, { status: ApifyRunStatusEnum.RUNNING });
		if (!running.length) return 0;
		const workflowIds = [
			...new Set(running.flatMap(record => (record.workflowId ? [record.workflowId] : []))),
		];
		const statuses = new Map(
			workflowIds.length ?
				(
					await this.durable.list({
						workflowIDs: workflowIds,
						loadInput: false,
						loadOutput: false,
					})
				).map(workflow => [workflow.workflowID, workflow.status as string])
			:	[],
		);
		const settled: ApifyRun[] = [];
		for (const record of running) {
			const workflowStatus = record.workflowId ? statuses.get(record.workflowId) : undefined;
			if (workflowStatus && LIVE_WORKFLOW_STATUSES.includes(workflowStatus)) continue;
			const why = orphanReason(record.workflowId, workflowStatus);
			if (!record.apifyRunId) {
				record.status = ApifyRunStatusEnum.FAILED;
				record.error = `Never started: ${why}`;
				record.finishedAt = new Date();
				settled.push(record);
				continue;
			}
			let run: Awaited<ReturnType<ReturnType<ApifyClient['run']>['get']>>;
			try {
				run = await this.getClient().run(record.apifyRunId).get();
			} catch (e) {
				// Apify unreadable now: the next tick tries again
				this.logger.warn(`Run ${record.apifyRunId} not read: ${(e as Error).message}`);
				continue;
			}
			if (run && RUN_IN_PROGRESS.includes(run.status)) continue;
			record.costUsd = run?.usageTotalUsd ?? record.costUsd ?? null;
			record.finishedAt = run?.finishedAt ? new Date(run.finishedAt) : new Date();
			// Apify's own outcome; the error says the items were never stored
			record.status =
				run?.status === 'SUCCEEDED' ? ApifyRunStatusEnum.SUCCEEDED
				: !run || run.status === 'FAILED' ? ApifyRunStatusEnum.FAILED
				: ApifyRunStatusEnum.PARTIAL;
			record.error =
				run ?
					`Items not stored: ${why} (Apify: ${run.status})`
				:	`Apify knows no run ${record.apifyRunId}: ${why}`;
			settled.push(record);
		}
		await em.flush();
		for (const record of settled) {
			this.logger.warn(
				`Closed ${record.actorId} run for "${record.purpose}" left RUNNING: ${record.error}`,
			);
			if (record.apifyRunId) await this.queueSettle(record.id);
		}
		return settled.length;
	}

	// ─── The account's credit ───

	/**
	 * The account as Apify reports it now (`users/me/limits`: the cycle's usage limit, what it used,
	 * the cycle's dates), less the caps of our runs still going: their cost is not (all) in Apify's
	 * figure yet, so each counts its whole cap until it ends (`remainingUsd` errs low).
	 */
	async credit(): Promise<ApifyCredit> {
		const limits = await this.getClient().user('me').limits();
		if (!limits) throw new Error('Apify returned no account limits');
		const [row]: { usd: number | string | null; runs: number | string }[] =
			await this.apifyRunRepository
				.getEntityManager()
				.getConnection()
				.execute(
					`select coalesce(sum(max_cost_usd), 0)::float as usd, count(*)::int as runs
					from apify_runs where status = ?`,
					[ApifyRunStatusEnum.RUNNING],
				);
		const limitUsd = limits.limits.maxMonthlyUsageUsd;
		const usedUsd = limits.current.monthlyUsageUsd;
		const runningCapsUsd = Number(row?.usd ?? 0);
		return {
			limitUsd,
			usedUsd,
			cycleStart: limits.monthlyUsageCycle.startAt,
			cycleEnd: limits.monthlyUsageCycle.endAt,
			runningRuns: Number(row?.runs ?? 0),
			runningCapsUsd,
			remainingUsd: limitUsd - usedUsd - runningCapsUsd,
			readAt: new Date(),
		};
	}

	/**
	 * What new runs may still spend this cycle (`credit().remainingUsd`); null when the account
	 * can't be read, in which case a run goes ahead (Apify enforces its cap anyway)
	 */
	async remainingCreditUsd(): Promise<number | null> {
		return (await this.creditCheck())?.remainingUsd ?? null;
	}

	/** The actor-run workflow's `check credit` step: what is left and when the cycle ends; null when unreadable */
	async creditCheck(): Promise<{ remainingUsd: number; cycleEnd: string; at: string } | null> {
		try {
			const credit = await this.credit();
			return {
				remainingUsd: credit.remainingUsd,
				cycleEnd: credit.cycleEnd.toISOString(),
				at: credit.readAt.toISOString(),
			};
		} catch (e) {
			this.logger.warn(`Apify account not read: ${(e as Error).message}`);
			return null;
		}
	}

	/** The actor runs waiting for credit now: running workflows that publish `APIFY_CREDIT_WAIT_EVENT` */
	async creditWaiters(): Promise<ApifyCreditWaiter[]> {
		if (!this.durable.isLaunched()) return [];
		const pending = await this.durable.list({
			workflowName: APIFY_RUN_ACTOR_WORKFLOW.name,
			status: 'PENDING',
		});
		const waiters: ApifyCreditWaiter[] = [];
		for (const run of pending) {
			const wait = await this.durable.getEvent<ApifyCreditWait>(
				run.workflowID,
				APIFY_CREDIT_WAIT_EVENT,
			);
			if (wait) waiters.push({ workflowId: run.workflowID, ...wait });
		}
		return waiters;
	}

	/**
	 * Wakes the waiting runs the account now covers (`wakeableWaiters`): an admin's "wake" after
	 * buying credit. Plain code; the schedule does the same with each read a step.
	 */
	async wakeCreditWaiters(): Promise<{ waiting: number; woken: number }> {
		const waiters = await this.creditWaiters();
		if (!waiters.length) return { waiting: 0, woken: 0 };
		const woken = wakeableWaiters(waiters, await this.remainingCreditUsd());
		for (const waiter of woken)
			await this.durable.send(waiter.workflowId, 'credit', APIFY_CREDIT_TOPIC);
		return { waiting: waiters.length, woken: woken.length };
	}

	// ─── Shared pieces ───

	private async listItems<T>(client: ApifyClient, datasetId: string): Promise<T[]> {
		const items: T[] = [];
		const dataset = client.dataset(datasetId);
		for (let offset = 0; ; offset += 1000) {
			const page = await dataset.listItems({ offset, limit: 1000 });
			items.push(...(page.items as T[]));
			if (page.items.length < 1000) break;
		}
		return items;
	}

	/**
	 * A run stopped by the cap or a timeout still has paid-for partial results. So does one an
	 * actor limited for Free users: it ends SUCCEEDED and says so in its status message or only in
	 * its log (`planLimit`).
	 */
	private closeRecord(
		record: ApifyRun,
		status: string,
		itemCount: number,
		planLimit: string | null,
		actorId: string,
	): void {
		record.status =
			status === 'SUCCEEDED' && !planLimit ?
				ApifyRunStatusEnum.SUCCEEDED
			:	ApifyRunStatusEnum.PARTIAL;
		record.error = planLimit ? `Free-plan limit: ${planLimit}` : null;
		if (planLimit)
			this.logger.warn(
				`${actorId} stopped at ${itemCount} items on its Free-plan limit: ${planLimit}`,
			);
		record.itemCount = itemCount;
		record.finishedAt = new Date();
		this.logger.log(
			`${actorId} ${status}: ${itemCount} items, $${(record.costUsd ?? 0).toFixed(2)}`,
		);
	}

	/**
	 * Starts a run, waiting while Apify refuses it for the plan's memory (other runs, ours or a
	 * restarted step's, still hold it): the refusal costs nothing, and the runs end within minutes.
	 */
	private async startWhenMemoryFrees<R>(start: () => Promise<R>): Promise<R> {
		for (let attempt = 0; ; attempt++) {
			try {
				return await start();
			} catch (e) {
				if (
					!isMemoryLimitError(e) ||
					attempt >= MEMORY_RETRIES ||
					processShutdown.requested
				)
					throw e;
				this.logger.warn(
					`Apify memory is full; starting again in ${MEMORY_RETRY_SECONDS} s`,
				);
				await new Promise(resolve => setTimeout(resolve, this.memoryRetryMs));
			}
		}
	}

	/**
	 * Reads a finished run's cost from Apify again (the `settle-apify-run-cost` job queues it a
	 * few minutes after the run). Pay-per-event charges are in `usageTotalUsd`.
	 */
	async settleCost(id: string): Promise<void> {
		const em = this.apifyRunRepository.getEntityManager().fork();
		const record = await em.findOne(ApifyRun, id);
		if (!record?.apifyRunId) return;
		const run = await this.getClient().run(record.apifyRunId).get();
		if (typeof run?.usageTotalUsd !== 'number') return;
		record.costUsd = run.usageTotalUsd;
		await em.flush();
	}

	/** A finished run's log, or undefined when it cannot be read (it only adds the plan check). */
	private async readLog(client: ApifyClient, runId: string): Promise<string | undefined> {
		try {
			return (await client.log(runId).get()) ?? undefined;
		} catch {
			return undefined;
		}
	}

	private async queueSettle(id: string): Promise<void> {
		try {
			await this.pgBossService.sendJob(
				SettleApifyRunCostJob.jobName,
				new SettleApifyRunCostJob({ apifyRunId: id }),
				{ startAfter: COST_SETTLE_DELAY_SECONDS },
			);
		} catch (e) {
			// The first figure stays; the run's items are worth more than its exact cost
			this.logger.warn(
				`Could not queue the cost re-read of run ${id}: ${(e as Error).message}`,
			);
		}
	}
}
