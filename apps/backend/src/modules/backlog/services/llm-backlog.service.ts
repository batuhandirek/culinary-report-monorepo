import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import { processShutdown } from 'src/modules/apify/util/apify-run-context.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { isFatalProviderError } from 'src/shared/util/pool.js';

import { backlogConfig } from '../config/backlog.config.js';
import { LLM_BACKLOG_MAX_MINUTES, LLM_BACKLOG_SINGLETON_KEY } from '../constants/backlog.constant.js';
import { BacklogRun, BacklogStopReason } from '../entities/backlog-run.entity.js';
import type { LlmBacklog } from '../interfaces/llm-backlog.interface.js';
import { LlmBacklogJob, LlmBacklogJobPayload } from '../jobs/llm-backlog.job.js';

import { LlmBacklogRegistry } from './llm-backlog-registry.service.js';

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

/** Stops every backlog after it for the day, not only the one it happened in */
const DAY_STOPS: BacklogStopReason[] = ['allowance', 'budget', 'shutdown'];

/** YYYY-MM-DD in UTC: the allowance's day */
export const utcDay = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * Drains the registered LLM backlogs (`LlmBacklogRegistry`) a little each day: the only caller of
 * `LlmBacklog.runBatch` and the only writer of `BacklogRun`.
 */
@Injectable()
export class LlmBacklogService {
	private readonly logger = new Logger(LlmBacklogService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly registry: LlmBacklogRegistry,
		private readonly pgBossService: PgBossService,
	) {}

	/** Queues a drain (the daily cron, or an admin's "Run now"); one runs and one waits at most */
	async queue(trigger: LlmBacklogJobPayload['trigger']): Promise<void> {
		await this.pgBossService.sendJob(LlmBacklogJob.jobName, new LlmBacklogJob({ trigger }), {
			singletonKey: LLM_BACKLOG_SINGLETON_KEY,
		});
	}

	/**
	 * Takes the backlogs by priority and runs batches of each until it is empty, the day's token
	 * budget (over every backlog, counted from what batches report) is spent, a batch throws what
	 * `isFatalProviderError` matches (every account out of allowance: the day stops, the job does
	 * not fail), or the time limit is reached. A batch's other errors stop that backlog only. Each
	 * backlog's day is one `BacklogRun`, flushed after every batch so the Data page sees progress.
	 */
	async drain(
		opts: { budget?: number; maxMinutes?: number; now?: () => Date } = {},
	): Promise<BacklogRun[]> {
		const now = opts.now ?? (() => new Date());
		const startedAt = now().getTime();
		const deadline = startedAt + (opts.maxMinutes ?? LLM_BACKLOG_MAX_MINUTES) * 60_000;
		const day = utcDay(now());
		const budget = opts.budget ?? backlogConfig.LLM_BACKLOG_DAILY_TOKENS;
		let spent = await this.tokensOn(day);
		let dayStop: BacklogStopReason | undefined;
		const runs: BacklogRun[] = [];

		for (const backlog of this.registry.list()) {
			const run = await this.runOf(backlog.key, day);
			runs.push(run);
			run.error = null;
			let reason = dayStop;
			while (!reason) {
				if (processShutdown.requested) reason = 'shutdown';
				else if (spent >= budget || now().getTime() >= deadline) reason = 'budget';
				if (reason) break;

				const remaining = await backlog.remaining();
				if (remaining === 0) {
					reason = 'empty';
					break;
				}
				let batch: { done: number; tokens?: number };
				try {
					batch = await backlog.runBatch();
				} catch (e) {
					if (isFatalProviderError(e)) reason = 'allowance';
					else {
						reason = 'error';
						run.error = (e as Error).message?.slice(0, 1000) ?? String(e);
					}
					this.logger.warn(`LLM backlog ${backlog.key} stopped (${reason}): ${(e as Error).message}`);
					break;
				}
				run.batches++;
				run.done += batch.done;
				if (batch.tokens !== undefined) {
					run.tokens = (run.tokens ?? 0) + batch.tokens;
					spent += batch.tokens;
				}
				// An item the agent never settles would otherwise be asked forever
				if (batch.done === 0) {
					reason = 'error';
					run.error = `A batch settled nothing with ${remaining} left`;
				}
				await this.em.flush();
			}
			if (reason && DAY_STOPS.includes(reason)) dayStop = reason;
			run.stopReason = reason ?? null;
			run.remaining = await this.remainingOf(backlog);
			run.finishedAt = now();
			await this.em.flush();
			this.logger.log(
				`LLM backlog ${backlog.key}: ${run.done} done today in ${run.batches} batches, ${run.remaining ?? '?'} left, stopped: ${reason}`,
			);
		}
		return runs;
	}

	/** Each backlog with what is left, the last seven days and its newest run, in run order */
	async status(now = new Date()): Promise<{ dailyTokens: number; spentToday: number; backlogs: LlmBacklogStatus[] }> {
		const since = utcDay(new Date(now.getTime() - 6 * 24 * 60 * 60_000));
		const rows = await this.em.find(BacklogRun, { day: { $gte: since } }, { orderBy: { day: 'desc' } });
		const moved: { key: string; at: Date }[] = await this.em.getConnection().execute(
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

	private async runOf(key: string, day: string): Promise<BacklogRun> {
		const existing = await this.em.findOne(BacklogRun, { key, day });
		if (existing) return existing;
		const run = this.em.create(BacklogRun, { key, day });
		await this.em.flush();
		return run;
	}

	private async tokensOn(day: string): Promise<number> {
		const [row]: { n: number }[] = await this.em
			.getConnection()
			.execute(`select coalesce(sum(tokens), 0)::int as n from backlog_runs where day = ?`, [day]);
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
