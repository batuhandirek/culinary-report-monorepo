import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import { processShutdown } from 'src/modules/apify/util/process-shutdown.js';
import { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';
import { withLlmCallContext } from 'src/modules/llm/util/llm-call-context.js';
import { isFatalProviderError } from 'src/shared/util/pool.js';

import { backlogConfig } from '../config/backlog.config.js';
import {
	LLM_BACKLOG_MAX_MINUTES,
	LLM_BACKLOG_SINGLETON_KEY,
	LLM_BACKLOG_WORKFLOW,
} from '../constants/backlog.constant.js';
import { BacklogRun, BacklogStopReason } from '../entities/backlog-run.entity.js';
import type { LlmBacklog } from '../interfaces/llm-backlog.interface.js';
import { LLM_BACKLOG_QUEUE } from '../queues/llm-backlog.queue.js';

import { LlmBacklogRegistry } from './llm-backlog-registry.service.js';

/** Who asked for a drain: the daily cron or an admin's "Run now" */
export type LlmBacklogTrigger = 'cron' | 'admin';

/**
 * How `drain` runs each of its parts: plainly (the default), or as a checkpointed step of the
 * workflow around it (`LlmBacklogWorkflows.drain` passes `DurableWorkflowsService.step`), so a
 * restart resumes after the last finished batch instead of ending the day
 */
export type DrainStep = <T>(name: string, fn: () => Promise<T>) => Promise<T>;

export interface LlmBacklogStatus {
	key: string;
	label: string;
	priority: number;
	/** `null` when counting failed */
	remaining: number | null;
	doneLast7Days: number;
	tokensLast7Days: number;
	/** The last run that settled anything */
	lastMovedAt?: Date;
	/** The newest day's row */
	lastRun?: BacklogRun;
}

/** What one batch did, as its step stores it */
type BatchOutcome = { done: number; tokens?: number } | { error: string; fatal: boolean };

/**
 * Stops every backlog after it for the day, not only the one it happened in. Not `allowance`:
 * backlogs can run on different models (`LLM_AGENT_MODELS`), so one with no model left says
 * nothing about the next, and the next one's first batch fails fast if it is the same.
 */
const DAY_STOPS: BacklogStopReason[] = ['budget', 'shutdown'];

/** YYYY-MM-DD in UTC: the allowance's day */
export const utcDay = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * Drains the registered LLM backlogs (`LlmBacklogRegistry`) a little each day: the only caller of
 * `LlmBacklog.runBatch` and the only writer of `BacklogRun`. Every part that touches the world (a
 * batch, a count, the row's update) is its own step, so the drain can run as a durable workflow.
 */
@Injectable()
export class LlmBacklogService {
	private readonly logger = new Logger(LlmBacklogService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly registry: LlmBacklogRegistry,
		private readonly durable: DurableWorkflowsService,
	) {}

	/**
	 * Queues a drain (`LlmBacklogWorkflows.drain` on `LLM_BACKLOG_QUEUE`; the daily cron, or an
	 * admin's "Run now"); one runs and one waits at most (`LLM_BACKLOG_SINGLETON_KEY`)
	 */
	async queue(trigger: LlmBacklogTrigger): Promise<void> {
		await this.durable.enqueue(LLM_BACKLOG_WORKFLOW, [trigger], {
			queue: LLM_BACKLOG_QUEUE,
			dedupe: LLM_BACKLOG_SINGLETON_KEY,
			onDuplicate: 'return-existing',
			attributes: { purpose: 'backlog', trigger },
		});
	}

	/**
	 * Takes the backlogs by priority and runs batches of each until it is empty, the day's token
	 * budget (over every backlog, counted from what batches report) is spent, a batch throws what
	 * `isFatalProviderError` matches (no model left for it: that backlog stops for the day, the run
	 * does not fail; batches run on the free models only, as everything outside `llmPaid` does), or
	 * the time limit is reached. A backlog that waits for something (`waitsFor`) runs no batch and
	 * says why. A batch's other errors stop that backlog only. Each backlog's day is one
	 * `BacklogRun`, written after every batch so the Data page sees progress.
	 */
	async drain(
		opts: {
			budget?: number;
			maxMinutes?: number;
			now?: () => Date;
			step?: DrainStep;
		} = {},
	): Promise<BacklogRun[]> {
		const step: DrainStep = opts.step ?? ((_name, fn) => fn());
		const now = opts.now ?? (() => new Date());
		const startedAt = now().getTime();
		const deadline = startedAt + (opts.maxMinutes ?? LLM_BACKLOG_MAX_MINUTES) * 60_000;
		const day = utcDay(now());
		const budget = opts.budget ?? backlogConfig.LLM_BACKLOG_DAILY_TOKENS;
		let spent = await step('tokens spent today', () => this.tokensOn(day));
		let dayStop: BacklogStopReason | undefined;
		const runIds: string[] = [];

		for (const backlog of this.registry.list()) {
			const runId = await step(`${backlog.key}: today's run`, () =>
				this.runOf(backlog.key, day),
			);
			runIds.push(runId);
			let reason: BacklogStopReason | undefined = dayStop;
			let error: string | null = null;
			if (!reason && backlog.waitsFor) {
				const waits = await step(`${backlog.key}: may it run`, () =>
					backlog.waitsFor!().catch(
						(e: Error) => `Checking whether it may run failed: ${e.message}`,
					),
				);
				if (waits) {
					reason = 'waiting';
					error = waits.slice(0, 1000);
				}
			}
			for (let batch = 1; !reason; batch++) {
				if (processShutdown.requested) reason = 'shutdown';
				else if (spent >= budget || now().getTime() >= deadline) reason = 'budget';
				if (reason) break;

				const remaining = await step(`${backlog.key}: remaining`, () =>
					backlog.remaining(),
				);
				if (remaining === 0) {
					reason = 'empty';
					break;
				}
				const outcome = await step(`${backlog.key}: batch ${batch}`, () =>
					this.runBatch(backlog, runId),
				);
				if ('error' in outcome) {
					reason = outcome.fatal ? 'allowance' : 'error';
					if (!outcome.fatal) error = outcome.error;
					this.logger.warn(
						`LLM backlog ${backlog.key} stopped (${reason}): ${outcome.error}`,
					);
					break;
				}
				if (outcome.tokens !== undefined) spent += outcome.tokens;
				// An item the agent never settles would otherwise be asked forever
				if (outcome.done === 0) {
					reason = 'error';
					error = `A batch settled nothing with ${remaining} left`;
				}
			}
			if (reason && DAY_STOPS.includes(reason)) dayStop = reason;
			await step(`${backlog.key}: close`, () =>
				this.closeRun(runId, backlog, reason ?? null, error, now()),
			);
		}
		const em = this.em.fork();
		const runs = await em.find(BacklogRun, { id: { $in: runIds } });
		return runIds.map(id => runs.find(run => run.id === id)!);
	}

	/** Each backlog with what is left, the last seven days and its newest run, in run order */
	async status(
		now = new Date(),
	): Promise<{ dailyTokens: number; spentToday: number; backlogs: LlmBacklogStatus[] }> {
		const since = utcDay(new Date(now.getTime() - 6 * 24 * 60 * 60_000));
		const rows = await this.em.find(
			BacklogRun,
			{ day: { $gte: since } },
			{ orderBy: { day: 'desc' } },
		);
		const moved: { key: string; at: Date }[] = await this.em
			.getConnection()
			.execute(
				`select key, max(finished_at) as at from backlog_runs where done > 0 group by key`,
			);
		const backlogs: LlmBacklogStatus[] = [];
		for (const backlog of this.registry.list()) {
			const own = rows.filter(row => row.key === backlog.key);
			const lastMovedAt = moved.find(m => m.key === backlog.key)?.at;
			backlogs.push({
				key: backlog.key,
				label: backlog.label,
				priority: backlog.priority,
				remaining: await this.remainingOf(backlog),
				doneLast7Days: own.reduce((sum, row) => sum + row.done, 0),
				tokensLast7Days: own.reduce((sum, row) => sum + (row.tokens ?? 0), 0),
				lastMovedAt: lastMovedAt ? new Date(lastMovedAt) : undefined,
				lastRun: own[0],
			});
		}
		return {
			dailyTokens: backlogConfig.LLM_BACKLOG_DAILY_TOKENS,
			spentToday: await this.tokensOn(utcDay(now)),
			backlogs,
		};
	}

	/** One batch, its LLM calls filed under the backlog, and the day's row moved on by what it did */
	private async runBatch(backlog: LlmBacklog, runId: string): Promise<BatchOutcome> {
		let batch: { done: number; tokens?: number };
		try {
			batch = await withLlmCallContext({ purpose: `backlog:${backlog.key}` }, () =>
				backlog.runBatch(),
			);
		} catch (e) {
			return {
				error: (e as Error).message?.slice(0, 1000) ?? String(e),
				fatal: isFatalProviderError(e),
			};
		}
		const em = this.em.fork();
		const run = await em.findOneOrFail(BacklogRun, runId);
		run.batches++;
		run.done += batch.done;
		if (batch.tokens !== undefined) run.tokens = (run.tokens ?? 0) + batch.tokens;
		await em.flush();
		return batch;
	}

	private async closeRun(
		runId: string,
		backlog: LlmBacklog,
		reason: BacklogStopReason | null,
		error: string | null,
		at: Date,
	): Promise<void> {
		const em = this.em.fork();
		const run = await em.findOneOrFail(BacklogRun, runId);
		run.stopReason = reason;
		run.error = error;
		run.remaining = await this.remainingOf(backlog);
		run.finishedAt = at;
		await em.flush();
		this.logger.log(
			`LLM backlog ${backlog.key}: ${run.done} done today in ${run.batches} batches, ${run.remaining ?? '?'} left, stopped: ${reason}`,
		);
	}

	/** The day's row for the backlog, made when missing; its id */
	private async runOf(key: string, day: string): Promise<string> {
		const em = this.em.fork();
		const existing = await em.findOne(BacklogRun, { key, day });
		if (existing) return existing.id;
		const run = em.create(BacklogRun, { key, day });
		await em.flush();
		return run.id;
	}

	private async tokensOn(day: string): Promise<number> {
		const [row]: { n: number }[] = await this.em
			.getConnection()
			.execute(`select coalesce(sum(tokens), 0)::int as n from backlog_runs where day = ?`, [
				day,
			]);
		return row.n;
	}

	private async remainingOf(backlog: LlmBacklog): Promise<number | null> {
		try {
			return await backlog.remaining();
		} catch (e) {
			this.logger.warn(`Counting LLM backlog ${backlog.key} failed: ${(e as Error).message}`);
			return null;
		}
	}
}
