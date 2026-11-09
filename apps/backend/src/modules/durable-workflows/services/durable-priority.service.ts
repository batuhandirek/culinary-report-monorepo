import { AsyncLocalStorage } from 'node:async_hooks';

import { Inject, Injectable, Logger } from '@nestjs/common';

import pg from 'pg';

import {
	DURABLE_WORKFLOWS_LOGGER,
	DURABLE_WORKFLOWS_OPTIONS,
} from '../constants/durable-workflows.constant.js';
import {
	DEFAULT_DURABLE_PRIORITY,
	DURABLE_PRIORITIES,
	DURABLE_PRIORITY_ATTRIBUTE,
	DURABLE_PRIORITY_RANK,
	type DurablePriority,
	isDurablePriority,
} from '../constants/durable-priority.constant.js';
import type { DurableWorkflowsModuleOptions } from '../interfaces/durable-workflows.interface.js';

/** A run that can still be sped up: waiting on its queue, delayed, or running (its next children) */
const LIVE_STATUSES = ['ENQUEUED', 'DELAYED', 'PENDING'];

/** The level of the workflow whose body is running; mutable, so a raise reaches a running body */
interface RunningLevel {
	workflowId: string;
	level: DurablePriority;
}

/**
 * Each run's priority level, and how it passes down. Every workflow body runs inside `runAs`:
 * it reads the run's level once as the body starts and keeps it in an async-local store, so the
 * facade gives a child its parent's level without a query (`current`). Raising a run (`set`)
 * rewrites it and every live run under it, and the level of those whose body runs in this process.
 *
 * The reads and writes go to DBOS's `workflow_status` directly, on a small pool of its own, not
 * through DBOS's API: inside a workflow, `DBOS.getWorkflowStatus` and `DBOS.setWorkflowPriority`
 * are recorded as steps, and a call added to a body shifts the step positions of every run already
 * in flight. Neither changes what a run does, only when its queue hands it out, so replaying them
 * is harmless.
 */
@Injectable()
export class DurablePriorityService {
	private readonly logger = new Logger(DURABLE_WORKFLOWS_LOGGER);
	private readonly store = new AsyncLocalStorage<RunningLevel>();
	private readonly running = new Map<string, RunningLevel>();
	private pool?: pg.Pool;

	constructor(
		@Inject(DURABLE_WORKFLOWS_OPTIONS) private readonly options: DurableWorkflowsModuleOptions,
	) {}

	/** Runs a workflow's body with its run's level at hand (the scanner wraps every registered workflow in it) */
	async runAs<T>(workflowId: string, body: () => Promise<T>): Promise<T> {
		let level = DEFAULT_DURABLE_PRIORITY;
		try {
			level = await this.levelOf(workflowId);
		} catch (e) {
			this.logger.warn(
				`Could not read the priority of ${workflowId}, running it as ${level}: ${(e as Error).message}`,
			);
		}
		const entry: RunningLevel = { workflowId, level };
		this.running.set(workflowId, entry);
		try {
			return await this.store.run(entry, body);
		} finally {
			if (this.running.get(workflowId) === entry) this.running.delete(workflowId);
		}
	}

	/** The level of the workflow whose body this call is in; undefined outside one */
	current(): DurablePriority | undefined {
		return this.store.getStore()?.level;
	}

	/** The level a run was started with (its attribute); `normal` when it has none (a schedule's firing, a fork, a direct call) */
	async levelOf(workflowId: string): Promise<DurablePriority> {
		const { rows } = await this.db().query<{ level: string | null }>(
			`SELECT attributes->>'${DURABLE_PRIORITY_ATTRIBUTE}' AS level
			 FROM ${this.table()} WHERE workflow_uuid = $1`,
			[workflowId],
		);
		const level = rows[0]?.level;
		return isDurablePriority(level) ? level : DEFAULT_DURABLE_PRIORITY;
	}

	/**
	 * Sets the run and every live run under it (its children, theirs, …) to `level`: the queued
	 * ones are taken sooner, the running ones start their next children at it. With `onlyRaise`
	 * a run already at a better level keeps it. Returns the runs changed.
	 */
	async set(
		workflowId: string,
		level: DurablePriority,
		{ onlyRaise = false }: { onlyRaise?: boolean } = {},
	): Promise<string[]> {
		const rank = DURABLE_PRIORITY_RANK[level];
		const currentRank = `CASE w.attributes->>'${DURABLE_PRIORITY_ATTRIBUTE}' ${DURABLE_PRIORITIES.map(
			l => `WHEN '${l}' THEN ${DURABLE_PRIORITY_RANK[l]}`,
		).join(' ')} ELSE ${DURABLE_PRIORITY_RANK[DEFAULT_DURABLE_PRIORITY]} END`;
		const { rows } = await this.db().query<{ workflow_uuid: string }>(
			`WITH RECURSIVE tree AS (
				SELECT workflow_uuid FROM ${this.table()}
				WHERE workflow_uuid = $1 AND status = ANY($4)
				UNION
				SELECT c.workflow_uuid FROM ${this.table()} c
				JOIN tree ON c.parent_workflow_id = tree.workflow_uuid
				WHERE c.status = ANY($4)
			)
			UPDATE ${this.table()} w
			SET priority = $2,
				attributes = COALESCE(w.attributes, '{}'::jsonb) || jsonb_build_object('${DURABLE_PRIORITY_ATTRIBUTE}', $3::text),
				updated_at = (EXTRACT(EPOCH FROM now()) * 1000)::bigint
			FROM tree
			WHERE w.workflow_uuid = tree.workflow_uuid
				AND ($5::boolean IS FALSE OR ${currentRank} > $2)
			RETURNING w.workflow_uuid`,
			[workflowId, rank, level, LIVE_STATUSES, onlyRaise],
		);
		const changed = rows.map(r => r.workflow_uuid);
		// A body running in this process starts its next children at the new level
		for (const id of changed) {
			const entry = this.running.get(id);
			if (entry) entry.level = level;
		}
		return changed;
	}

	async close(): Promise<void> {
		const pool = this.pool;
		this.pool = undefined;
		await pool?.end();
	}

	private table(): string {
		return `"${this.options.schema ?? 'dbos'}".workflow_status`;
	}

	private db(): pg.Pool {
		if (!this.pool) {
			this.pool = new pg.Pool({
				connectionString: this.options.systemDatabaseUrl,
				max: 2,
				idleTimeoutMillis: 30_000,
			});
			this.pool.on('error', e =>
				this.logger.warn(`Priority pool connection failed: ${e.message}`),
			);
		}
		return this.pool;
	}
}
