import type { DurablePriority } from '../constants/durable-priority.constant.js';

export type DurableWorkflowStatus =
	| 'PENDING'
	| 'SUCCESS'
	| 'ERROR'
	| 'MAX_RECOVERY_ATTEMPTS_EXCEEDED'
	| 'CANCELLED'
	| 'ENQUEUED'
	| 'DELAYED';

export interface AdminWorkflowOutputDto {
	id: string;
	status: DurableWorkflowStatus;
	/** The method's registered name, e.g. `ingestCity` */
	name: string;
	/** The service's class, e.g. `IngestionWorkflows` */
	className: string;
	queue?: string;
	/** The schedule that fired it */
	schedule?: string;
	parentWorkflowId?: string;
	createdAt: Date;
	updatedAt?: Date;
	dequeuedAt?: Date;
	completedAt?: Date;
	delayUntil?: Date;
	deduplicationId?: string;
	/** How soon its queue hands it out (`StartOptions.priority`); `normal` for a run started outside the facade */
	priority: DurablePriority;
	applicationVersion?: string;
	/** How often a restart picked it up again */
	recoveryAttempts?: number;
	/** The tags it was started with (`StartOptions.attributes`), each value as text; the priority is `priority` */
	attributes?: Record<string, string>;
	/** The arguments it was started with, as JSON */
	input?: string;
	/** Its result, as JSON (SUCCESS only) */
	output?: string;
	/** Its error's message (ERROR only) */
	error?: string;
}

export interface AdminWorkflowPriorityOutputDto {
	workflowId: string;
	priority: DurablePriority;
	/** The live runs set to it: the run and the runs under it still waiting or running */
	changed: number;
}

export interface AdminWorkflowStepOutputDto {
	/** The step's position in the run; `fork` takes it */
	functionId: number;
	name: string;
	childWorkflowId?: string;
	startedAt?: Date;
	completedAt?: Date;
	/** The step's checkpointed result, as JSON */
	output?: string;
	error?: string;
}

export interface AdminWorkflowDetailOutputDto extends AdminWorkflowOutputDto {
	steps: AdminWorkflowStepOutputDto[];
}

export interface AdminListWorkflowsOutputDto {
	items: AdminWorkflowOutputDto[];
	page: number;
	pageSize: number;
	/** DBOS counts nothing: there is a next page when this page is full */
	hasMore: boolean;
}

export interface AdminWorkflowScheduleOutputDto {
	name: string;
	workflowName: string;
	workflowClassName: string;
	cron: string;
	/** `active` or `paused` */
	status: string;
	timezone?: string;
	queue?: string;
	lastFiredAt?: Date;
}

export interface AdminListWorkflowSchedulesOutputDto {
	items: AdminWorkflowScheduleOutputDto[];
}

export interface AdminWorkflowQueueOutputDto {
	name: string;
	workerConcurrency?: number;
	globalConcurrency?: number;
	rateLimit?: { limitPerPeriod: number; periodSec: number };
	/** Runs waiting on the queue (ENQUEUED or DELAYED) */
	waiting: number;
	/** Runs taken from the queue and running (PENDING) */
	running: number;
}

export interface AdminListWorkflowQueuesOutputDto {
	items: AdminWorkflowQueueOutputDto[];
}

/** What a cancel, resume, fork or trigger did */
export interface AdminWorkflowActionOutputDto {
	/** The run acted on; for a fork or a trigger, the new run */
	workflowId: string;
	status?: DurableWorkflowStatus;
}
