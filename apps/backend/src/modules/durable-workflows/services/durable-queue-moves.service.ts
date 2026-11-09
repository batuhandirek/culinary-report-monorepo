import { Inject, Injectable } from '@nestjs/common';

import pg from 'pg';

import { DURABLE_WORKFLOWS_OPTIONS } from '../constants/durable-workflows.constant.js';
import type { DurableWorkflowsModuleOptions } from '../interfaces/durable-workflows.interface.js';

/** A run still to finish: waiting on its queue, delayed, or running */
const LIVE_STATUSES = ['ENQUEUED', 'DELAYED', 'PENDING'];

/** A live run on a queue, as a move's picker sees it */
export interface QueuedRun {
	workflowId: string;
	className: string;
	workflowName: string;
	status: string;
	/** Its tags (`StartOptions.attributes`, the priority level) */
	attributes: Record<string, unknown>;
}

/**
 * Moves live runs from one queue to another by rewriting `queue_name` in DBOS's
 * `workflow_status`, the only thing that says which queue a run waits on and counts against.
 * Meant for `@BeforeDurableLaunch`: DBOS then recovers a run that was running (`PENDING`) onto
 * its new queue, its stored steps and a sleep's wake-up time untouched. A run with a dedupe key
 * stays where it is, since the key is unique per queue.
 */
@Injectable()
export class DurableQueueMovesService {
	constructor(
		@Inject(DURABLE_WORKFLOWS_OPTIONS) private readonly options: DurableWorkflowsModuleOptions,
	) {}

	/** Every live run on `queue` (its qualified name) without a dedupe key */
	async liveRuns(queue: string): Promise<QueuedRun[]> {
		return this.withClient(async client => {
			const { rows } = await client.query<{
				workflow_uuid: string;
				class_name: string | null;
				name: string | null;
				status: string;
				attributes: Record<string, unknown> | null;
			}>(
				`SELECT workflow_uuid, class_name, name, status, attributes FROM ${this.table()}
				 WHERE queue_name = $1 AND status = ANY($2) AND deduplication_id IS NULL`,
				[queue, LIVE_STATUSES],
			);
			return rows.map(r => ({
				workflowId: r.workflow_uuid,
				className: r.class_name ?? '',
				workflowName: r.name ?? '',
				status: r.status,
				attributes: r.attributes ?? {},
			}));
		});
	}

	/** Moves these runs from `from` to `to` (qualified names) while they are still live there; returns how many moved */
	async move(ids: string[], from: string, to: string): Promise<number> {
		if (!ids.length || from === to) return 0;
		return this.withClient(async client => {
			const { rowCount } = await client.query(
				`UPDATE ${this.table()}
				 SET queue_name = $3, updated_at = (EXTRACT(EPOCH FROM now()) * 1000)::bigint
				 WHERE workflow_uuid = ANY($1) AND queue_name = $2 AND status = ANY($4)
					AND deduplication_id IS NULL`,
				[ids, from, to, LIVE_STATUSES],
			);
			return rowCount ?? 0;
		});
	}

	private table(): string {
		return `"${this.options.schema ?? 'dbos'}".workflow_status`;
	}

	/** One short connection: moves run once at boot, before DBOS's own pool exists */
	private async withClient<T>(fn: (client: pg.Client) => Promise<T>): Promise<T> {
		const client = new pg.Client({ connectionString: this.options.systemDatabaseUrl });
		await client.connect();
		try {
			return await fn(client);
		} finally {
			await client.end();
		}
	}
}
