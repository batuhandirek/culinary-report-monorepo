import { Inject, Injectable, Logger } from '@nestjs/common';

import pg from 'pg';

import {
	DURABLE_PRUNE_FAILED_KEEP_DAYS,
	DURABLE_WORKFLOWS_LOGGER,
	DURABLE_WORKFLOWS_OPTIONS,
} from '../constants/durable-workflows.constant.js';
import type {
	DurableWorkflowsModuleOptions,
	WorkflowRef,
} from '../interfaces/durable-workflows.interface.js';

import { DurableWorkflowsService } from './durable-workflows.service.js';

const DAY_MS = 24 * 3600 * 1000;

/** Where a prune pass has got to: the last run it looked at, by `created_at` then id */
export interface PruneCursor {
	createdAt: number;
	id: string;
}

export interface PruneBatch {
	/** Runs past their `keepDays` it looked at */
	looked: number;
	/** Of those, the ones deleted; the rest sit under a run that is live or may be resumed */
	deleted: number;
	/** Null once there is nothing further */
	next: PruneCursor | null;
}

export type PruneRule = WorkflowRef & { keepDays: number };

/** How deep a run's parents are walked; the pipeline's deepest chain is about six */
const MAX_DEPTH = 24;

/**
 * Deletes the finished runs of the workflows that declare `keepDays` (`DurablePruneSchedule`),
 * this application's only. A run goes once it ended `keepDays` ago (a cancelled or failed one
 * `DURABLE_PRUNE_FAILED_KEEP_DAYS` at least, so it can still be resumed), and only while no run
 * above it is live, cancelled or failed within that time: a parent still running, or resumed
 * later, may still await a child it started, and DBOS waits for good on a child that is gone.
 * Reads `workflow_status` on a pool of its own, as `DurableRunTreeService` does; the delete is
 * DBOS's own (`DurableWorkflowsService.deleteRuns`), which knows every table a run has rows in.
 */
@Injectable()
export class DurablePruneService {
	private readonly logger = new Logger(DURABLE_WORKFLOWS_LOGGER);
	private pool?: pg.Pool;

	constructor(
		@Inject(DURABLE_WORKFLOWS_OPTIONS) private readonly options: DurableWorkflowsModuleOptions,
		private readonly durable: DurableWorkflowsService,
	) {}

	/** One batch: the next `limit` runs past their time after `after`, the deletable ones deleted */
	async batch(
		rules: PruneRule[],
		now: number,
		after: PruneCursor | null,
		limit: number,
	): Promise<PruneBatch> {
		if (!rules.length) return { looked: 0, deleted: 0, next: null };
		const rows = await this.candidates(rules, now, after, limit);
		const deletable = rows.filter(r => r.free).map(r => r.workflow_uuid);
		await this.durable.deleteRuns(deletable);
		const last = rows.at(-1);
		return {
			looked: rows.length,
			deleted: deletable.length,
			next:
				rows.length < limit || !last ?
					null
				:	{ createdAt: Number(last.created_at), id: last.workflow_uuid },
		};
	}

	async close(): Promise<void> {
		const pool = this.pool;
		this.pool = undefined;
		await pool?.end();
	}

	private async candidates(
		rules: PruneRule[],
		now: number,
		after: PruneCursor | null,
		limit: number,
	): Promise<{ workflow_uuid: string; created_at: string; free: boolean }[]> {
		const ws = `"${this.options.schema ?? 'dbos'}".workflow_status`;
		const failedKeepMs = DURABLE_PRUNE_FAILED_KEEP_DAYS * DAY_MS;
		const { rows } = await this.db().query<{
			workflow_uuid: string;
			created_at: string;
			free: boolean;
		}>(
			`WITH RECURSIVE rules AS (
				SELECT * FROM unnest($1::text[], $2::text[], $3::bigint[]) AS r(class_name, name, keep_ms)
			),
			cand AS (
				SELECT w.workflow_uuid, w.parent_workflow_id, w.created_at
				FROM ${ws} w JOIN rules r ON r.class_name = w.class_name AND r.name = w.name
				WHERE w.application_name = $4
					AND (w.created_at, w.workflow_uuid) > ($5::bigint, $6::text)
					AND (
						(w.status = 'SUCCESS' AND coalesce(w.completed_at, w.updated_at) < $7::bigint - r.keep_ms)
						OR (w.status IN ('CANCELLED', 'ERROR', 'MAX_RECOVERY_ATTEMPTS_EXCEEDED')
							AND coalesce(w.completed_at, w.updated_at) < $7::bigint - greatest(r.keep_ms, $8::bigint))
					)
				ORDER BY w.created_at, w.workflow_uuid
				LIMIT $9
			),
			up AS (
				SELECT c.workflow_uuid AS cand_id, c.parent_workflow_id AS id, 1 AS depth
				FROM cand c WHERE c.parent_workflow_id IS NOT NULL
				UNION ALL
				SELECT up.cand_id, p.parent_workflow_id, up.depth + 1
				FROM up JOIN ${ws} p ON p.workflow_uuid = up.id
				WHERE p.parent_workflow_id IS NOT NULL AND up.depth < $10
			)
			SELECT c.workflow_uuid, c.created_at, NOT EXISTS (
				SELECT 1 FROM up JOIN ${ws} a ON a.workflow_uuid = up.id
				WHERE up.cand_id = c.workflow_uuid
					AND a.status <> 'SUCCESS'
					AND NOT (a.status IN ('CANCELLED', 'ERROR', 'MAX_RECOVERY_ATTEMPTS_EXCEEDED')
						AND coalesce(a.completed_at, a.updated_at) < $7::bigint - $8::bigint)
			) AS free
			FROM cand c ORDER BY c.created_at, c.workflow_uuid`,
			[
				rules.map(r => r.className),
				rules.map(r => r.name),
				rules.map(r => Math.round(r.keepDays * DAY_MS)),
				this.options.applicationName,
				after?.createdAt ?? 0,
				after?.id ?? '',
				now,
				failedKeepMs,
				limit,
				MAX_DEPTH,
			],
		);
		return rows;
	}

	private db(): pg.Pool {
		if (!this.pool) {
			this.pool = new pg.Pool({
				connectionString: this.options.systemDatabaseUrl,
				max: 1,
				idleTimeoutMillis: 30_000,
			});
			this.pool.on('error', e =>
				this.logger.warn(`Prune pool connection failed: ${e.message}`),
			);
		}
		return this.pool;
	}
}
