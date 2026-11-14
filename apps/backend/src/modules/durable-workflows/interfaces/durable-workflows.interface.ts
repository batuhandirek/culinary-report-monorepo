import type { DurablePriority } from '../constants/durable-priority.constant.js';

/** `@DurableWorkflow()`: a method that runs as a durable workflow */
export interface DurableWorkflowOptions {
	/** Registered under this name instead of the method's (the pair class/name is the workflow's id in the database) */
	name?: string;
	/** How often a crashed run is picked up again before it is given up (`MAX_RECOVERY_ATTEMPTS_EXCEEDED`); DBOS's default is 100 */
	maxRecoveryAttempts?: number;
	/**
	 * Delete a finished run from DBOS this many days after it ended (`DurablePruneSchedule`); a
	 * cancelled or failed one after `DURABLE_PRUNE_FAILED_KEEP_DAYS` at least. Kept for good without.
	 * Only for runs nothing reads back once their parent has its result: one item's reading, one
	 * agent call. Never an operation's run: its fixed id per period would start it again.
	 */
	keepDays?: number;
}

/** `@DurableStep()` and `DurableWorkflowsService.step`: a checkpointed call */
export interface DurableStepOptions {
	name?: string;
	/** Retried on any error (`maxAttempts` in all, `intervalSeconds` before the first retry, `backoffRate` between them). Off by default: most steps spend money */
	retriesAllowed?: boolean;
	maxAttempts?: number;
	intervalSeconds?: number;
	backoffRate?: number;
	/** Per attempt */
	timeoutMs?: number;
}

/** `@DurableSchedule(name, cron, options)` */
export interface DurableScheduleOptions {
	/** IANA time zone the cron is read in; UTC without */
	tz?: string;
	/** The queue each firing is put on; DBOS's internal one without */
	queue?: DurableQueue;
	/** Fire the runs missed while the backend was down; off by default (a missed hourly pass is caught by the next) */
	backfill?: boolean;
	/** Each firing's run deleted this many days after it ended, as `DurableWorkflowOptions.keepDays` */
	keepDays?: number;
}

export interface DurableScheduleMetadata extends DurableScheduleOptions {
	name: string;
	cron: string;
}

/** A queue's limits (DBOS's `RegisterQueueOptions`) */
export interface DurableQueueOptions {
	/** Runs of the queue in this process at once */
	workerConcurrency?: number;
	/** Runs of the queue across every process at once */
	globalConcurrency?: number;
	/** Starts per period: a provider's requests a minute */
	rateLimit?: { limitPerPeriod: number; periodSec: number };
	/** How often an idle process asks the database for work; DBOS's default is a second */
	minPollingIntervalMs?: number;
}

/** A queue `defineDurableQueue` declared: its name and limits, registered with DBOS after launch */
export interface DurableQueue {
	name: string;
	options: DurableQueueOptions;
}

/** A workflow by its registered names, for callers that must not import the class (a service the workflow itself depends on) */
export interface WorkflowRef {
	className: string;
	name: string;
}

export interface StartOptions {
	/** Enqueue instead of starting at once: the queue's concurrency and rate limits apply */
	queue?: DurableQueue;
	/** A fixed id: starting it again while one with the id exists returns that one (idempotent starts) */
	workflowId?: string;
	/** With a queue: at most one workflow with this key waits or runs on it at a time */
	dedupe?: string;
	/** What a second start under the same `dedupe` does: throw (default) or hand back the one in flight */
	onDuplicate?: 'reject' | 'return-existing';
	/**
	 * How soon its queue hands it out: `high` passes every `normal` and `low` run waiting. Without
	 * it, the level of the workflow starting it (so everything under a `high` run is `high`), else
	 * `normal`. A `high` start handed a run already there raises that run and its children.
	 */
	priority?: DurablePriority;
	delaySeconds?: number;
	/** The whole run, children included, is cancelled past it */
	timeoutMs?: number;
	/** Searchable tags (`listWorkflows({ attributes })`): a city id, a purpose */
	attributes?: Record<string, unknown>;
}

export interface DurableWorkflowsModuleOptions {
	/** DBOS isolates workflows, queues and schedules by application name: a dev backend on a copy of the production database never sees production's */
	applicationName: string;
	/** Pinned, so a restart resumes every pending workflow with the current code (DBOS only recovers its own version) */
	applicationVersion: string;
	systemDatabaseUrl: string;
	/** The Postgres schema DBOS keeps its tables in (`dbos`) */
	schema?: string;
	poolSize?: number;
	/** Postgres LISTEN/NOTIFY for wake-ups; off, DBOS polls (the PGlite tests) */
	useListenNotify?: boolean;
	/** Nothing is launched: decorated methods run as plain methods, `start` throws */
	disabled?: boolean;
	/** Whether `@DurableSchedule`s are applied; off, this app's schedules are removed (`INGESTION_IS_DISABLED`) */
	schedulesEnabled?: boolean;
	tracingEnabled?: boolean;
	logLevel?: string;
}
