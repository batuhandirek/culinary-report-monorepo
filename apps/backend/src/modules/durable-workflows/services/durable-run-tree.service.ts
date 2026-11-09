import { Inject, Injectable, Logger } from '@nestjs/common';

import pg from 'pg';

import {
	DURABLE_WORKFLOWS_LOGGER,
	DURABLE_WORKFLOWS_OPTIONS,
} from '../constants/durable-workflows.constant.js';
import type { DurableWorkflowsModuleOptions } from '../interfaces/durable-workflows.interface.js';

/** A run as the tree needs it: no inputs or outputs, so a big tree stays a light read */
export interface RunTreeRow {
	id: string;
	parentId?: string;
	name: string;
	className: string;
	status: string;
	queue?: string;
	createdAt: number;
	completedAt?: number;
	attributes: Record<string, unknown>;
}

/** How deep the tree is read below its run; the pipeline's deepest chain is about six */
export const RUN_TREE_MAX_DEPTH = 12;

interface Row {
	workflow_uuid: string;
	parent_workflow_id: string | null;
	name: string | null;
	class_name: string | null;
	status: string;
	queue_name: string | null;
	created_at: string;
	completed_at: string | null;
	attributes: Record<string, unknown> | null;
}

const COLUMNS =
	'workflow_uuid, parent_workflow_id, name, class_name, status, queue_name, created_at, completed_at, attributes';

/**
 * Who started whom, read from DBOS's `workflow_status.parent_workflow_id` directly (DBOS's own
 * list reads one level at a time). Also the children a schedule's firing waits for. A pool of its
 * own, like `DurablePriorityService`: a read here is never recorded as a step.
 */
@Injectable()
export class DurableRunTreeService {
	private readonly logger = new Logger(DURABLE_WORKFLOWS_LOGGER);
	private pool?: pg.Pool;

	constructor(
		@Inject(DURABLE_WORKFLOWS_OPTIONS) private readonly options: DurableWorkflowsModuleOptions,
	) {}

	/** The runs `parentId` started, oldest first: the same list on every read, since only its body starts them */
	async childIds(parentId: string): Promise<string[]> {
		const { rows } = await this.db().query<{ workflow_uuid: string }>(
			`SELECT workflow_uuid FROM ${this.table()} WHERE parent_workflow_id = $1
			 ORDER BY created_at, workflow_uuid`,
			[parentId],
		);
		return rows.map(r => r.workflow_uuid);
	}

	/** The run and everything under it, at most `limit` runs; `truncated` when there were more */
	async descendants(
		rootId: string,
		limit: number,
	): Promise<{ rows: RunTreeRow[]; truncated: boolean }> {
		const { rows } = await this.db().query<Row>(
			`WITH RECURSIVE tree AS (
				SELECT ${COLUMNS}, 0 AS depth FROM ${this.table()} WHERE workflow_uuid = $1
				UNION ALL
				SELECT ${COLUMNS.split(', ')
					.map(c => `c.${c}`)
					.join(', ')}, tree.depth + 1
				FROM ${this.table()} c JOIN tree ON c.parent_workflow_id = tree.workflow_uuid
				WHERE tree.depth < $2
			)
			SELECT ${COLUMNS} FROM tree ORDER BY depth, created_at, workflow_uuid LIMIT $3`,
			[rootId, RUN_TREE_MAX_DEPTH, limit + 1],
		);
		return { rows: rows.slice(0, limit).map(toRow), truncated: rows.length > limit };
	}

	/** The runs above `id`, the root first, `id` itself left out */
	async ancestors(id: string): Promise<RunTreeRow[]> {
		const { rows } = await this.db().query<Row & { depth: number }>(
			`WITH RECURSIVE up AS (
				SELECT ${COLUMNS}, 0 AS depth FROM ${this.table()} WHERE workflow_uuid = $1
				UNION ALL
				SELECT ${COLUMNS.split(', ')
					.map(c => `p.${c}`)
					.join(', ')}, up.depth + 1
				FROM ${this.table()} p JOIN up ON p.workflow_uuid = up.parent_workflow_id
				WHERE up.depth < $2
			)
			SELECT ${COLUMNS}, depth FROM up WHERE depth > 0 ORDER BY depth DESC`,
			[id, RUN_TREE_MAX_DEPTH * 2],
		);
		return rows.map(toRow);
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
				this.logger.warn(`Run tree pool connection failed: ${e.message}`),
			);
		}
		return this.pool;
	}
}

const toRow = (r: Row): RunTreeRow => ({
	id: r.workflow_uuid,
	...(r.parent_workflow_id && { parentId: r.parent_workflow_id }),
	name: r.name ?? '',
	className: r.class_name ?? '',
	status: r.status,
	...(r.queue_name && { queue: r.queue_name }),
	createdAt: Number(r.created_at),
	...(r.completed_at !== null && { completedAt: Number(r.completed_at) }),
	attributes: r.attributes ?? {},
});
