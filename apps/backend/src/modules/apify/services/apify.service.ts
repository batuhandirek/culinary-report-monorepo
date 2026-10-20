import { createHash } from 'node:crypto';

import type { EntityManager } from '@mikro-orm/core';

import { Injectable, Logger } from '@nestjs/common';

import { ApifyClient } from 'apify-client';

import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';

import { apifyConfig } from '../config/apify.config.js';
import { ApifyRun, ApifyRunStatusEnum } from '../entities/apify-run.entity.js';
import { SettleApifyRunCostJob } from '../jobs/settle-apify-run-cost.job.js';
import { ApifyRunRepository } from '../repositories/apify-run.repository.js';
import {
	ApifyRunContext,
	apifyRunContext,
	processShutdown,
	ShuttingDownError,
} from '../util/apify-run-context.js';
import { planLimitNote } from '../util/plan-cap.js';

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
}

/** How long a start refused for the plan's memory waits before trying again, and how often. */
export const MEMORY_RETRY_SECONDS = 30;
export const MEMORY_RETRIES = 20;

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

/**
 * The one way to run an Apify actor. Every run is recorded as an `ApifyRun` with its cost,
 * and carries a spending cap Apify enforces, so no step can overspend the monthly credit.
 */
@Injectable()
export class ApifyService {
	private readonly logger = new Logger(ApifyService.name);
	private client?: ApifyClient;
	// Records this process started or re-attached to: never re-attached to again
	private readonly attached = new Set<string>();
	// Overridden by tests
	memoryRetryMs = MEMORY_RETRY_SECONDS * 1000;

	constructor(
		private readonly apifyRunRepository: ApifyRunRepository,
		private readonly pgBossService: PgBossService,
	) {}

	private getClient(): ApifyClient {
		if (!apifyConfig.APIFY_TOKEN) throw new Error('APIFY_TOKEN is not set');
		this.client ??= new ApifyClient({ token: apifyConfig.APIFY_TOKEN });
		return this.client;
	}

	/**
	 * Runs the actor to the end and returns every item of its dataset. The Apify run id is stored
	 * as soon as the run starts, so a backend restart never loses track of a paid run: inside a
	 * pipeline step (`apifyRunContext`), the resumed step re-attaches to the run an earlier attempt
	 * of the same step started with the same input, and reads its items instead of paying again.
	 */
	async runActor<T = Record<string, unknown>>(
		actorId: string,
		input: object,
		{ maxCostUsd, purpose, memoryMbytes }: RunActorOptions,
	): Promise<T[]> {
		const client = this.getClient();
		const em = this.apifyRunRepository.getEntityManager().fork();
		const context = apifyRunContext.getStore();
		if (processShutdown.requested) throw new ShuttingDownError();
		const inputHash = hashActorInput(actorId, input);
		const earlier = context ? await this.earlierAttempt(em, context, actorId, inputHash) : null;
		const record =
			earlier ??
			em.create(ApifyRun, {
				actorId,
				purpose,
				maxCostUsd,
				status: ApifyRunStatusEnum.RUNNING,
				inputHash,
				pipelineRunId: context?.pipelineRunId ?? null,
				stepKey: context?.stepKey ?? null,
			});
		if (earlier) {
			this.attached.add(earlier.id);
			earlier.status = ApifyRunStatusEnum.RUNNING;
			this.logger.log(`Re-attaching to ${actorId} run ${earlier.apifyRunId} for "${purpose}"`);
		} else {
			this.logger.log(`Starting ${actorId} for "${purpose}" (cap $${maxCostUsd})`);
		}
		await em.flush();

		try {
			if (!record.apifyRunId) {
				const started = await this.startWhenMemoryFrees(() =>
					client.actor(actorId).start(input, {
						maxTotalChargeUsd: maxCostUsd,
						...(memoryMbytes && { memory: memoryMbytes }),
					}),
				);
				record.apifyRunId = started.id;
				this.attached.add(record.id);
				await em.flush();
			}
			const run = await client.run(record.apifyRunId).waitForFinish();
			record.costUsd = run.usageTotalUsd ?? null;

			const items: T[] = [];
			const dataset = client.dataset(run.defaultDatasetId);
			for (let offset = 0; ; offset += 1000) {
				const page = await dataset.listItems({ offset, limit: 1000 });
				items.push(...(page.items as T[]));
				if (page.items.length < 1000) break;
			}

			// The finished run can still say $0: read it again now for a first figure, and once
			// more later (`settleCost`), when Apify has settled it
			const settled = await client
				.run(run.id)
				.get()
				.catch(() => undefined);
			record.costUsd = settled?.usageTotalUsd ?? record.costUsd;

			// A run stopped by the cap or a timeout still has paid-for partial results. So does
			// one an actor limited for Free users: it ends SUCCEEDED and says so in its status
			// message or only in its log
			const planLimit = planLimitNote(
				settled?.statusMessage ?? run.statusMessage,
				await this.readLog(client, run.id),
			);
			record.status =
				run.status === 'SUCCEEDED' && !planLimit ?
					ApifyRunStatusEnum.SUCCEEDED
				:	ApifyRunStatusEnum.PARTIAL;
			record.error = null;
			if (planLimit) {
				record.error = `Free-plan limit: ${planLimit}`;
				this.logger.warn(
					`${actorId} stopped at ${items.length} items on its Free-plan limit: ${planLimit}`,
				);
			}
			record.itemCount = items.length;
			record.finishedAt = new Date();
			await em.flush();
			this.logger.log(
				`${actorId} ${run.status}: ${items.length} items, $${(record.costUsd ?? 0).toFixed(2)}`,
			);
			return items;
		} catch (e) {
			record.status = ApifyRunStatusEnum.FAILED;
			record.error = (e as Error).message;
			record.finishedAt = new Date();
			await em.flush();
			throw e;
		} finally {
			if (record.apifyRunId) await this.queueSettle(record.id);
		}
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
				if (!isMemoryLimitError(e) || attempt >= MEMORY_RETRIES || processShutdown.requested) throw e;
				this.logger.warn(`Apify memory is full; starting again in ${MEMORY_RETRY_SECONDS} s`);
				await new Promise(resolve => setTimeout(resolve, this.memoryRetryMs));
			}
		}
	}

	/**
	 * The run an earlier attempt of this pipeline step started with the same input, not yet used
	 * by this process (a step calling an actor twice with one input gets two runs).
	 */
	private async earlierAttempt(
		em: EntityManager,
		context: ApifyRunContext,
		actorId: string,
		inputHash: string,
	): Promise<ApifyRun | null> {
		const runs = await em.find(
			ApifyRun,
			{
				pipelineRunId: context.pipelineRunId,
				stepKey: context.stepKey,
				actorId,
				inputHash,
				apifyRunId: { $ne: null },
				status: { $ne: ApifyRunStatusEnum.FAILED },
			},
			{ orderBy: { createdAt: 'desc' } },
		);
		return runs.find(r => !this.attached.has(r.id)) ?? null;
	}

	/**
	 * After a restart: runs still marked RUNNING that no resumed pipeline step will re-attach to
	 * (outside a pipeline, or their pipeline run is not resumed) get Apify's final status and cost.
	 * Their items were never stored. Returns how many were settled.
	 */
	async settleOrphans(keepPipelineRunIds: string[]): Promise<number> {
		const em = this.apifyRunRepository.getEntityManager().fork();
		const orphans = await em.find(ApifyRun, {
			status: ApifyRunStatusEnum.RUNNING,
			...(keepPipelineRunIds.length ?
				{ $or: [{ pipelineRunId: null }, { pipelineRunId: { $nin: keepPipelineRunIds } }] }
			:	{}),
		});
		for (const record of orphans) {
			record.finishedAt = new Date();
			if (!record.apifyRunId) {
				record.status = ApifyRunStatusEnum.FAILED;
				record.error = 'The backend restarted before the run started';
				continue;
			}
			const run = await this.getClient()
				.run(record.apifyRunId)
				.get()
				.catch(() => undefined);
			record.costUsd = run?.usageTotalUsd ?? record.costUsd;
			// Apify's own outcome, so a later attempt of the same step may still re-attach to it
			record.status =
				run?.status === 'SUCCEEDED' ? ApifyRunStatusEnum.SUCCEEDED
				: run?.status === 'FAILED' ? ApifyRunStatusEnum.FAILED
				: ApifyRunStatusEnum.PARTIAL;
			record.error = `Items not stored: the backend restarted while the run was ${run?.status ?? 'in an unknown state'}`;
		}
		await em.flush();
		return orphans.length;
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
