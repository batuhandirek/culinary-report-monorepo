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

/** A run in the tree of who started whom */
export interface AdminWorkflowTreeRunDto {
	kind: 'run';
	id: string;
	/** The node it hangs under (a run's id); none for the tree's top */
	parentKey?: string;
	name: string;
	className: string;
	status: DurableWorkflowStatus;
	/** Its declared queue name */
	queue?: string;
	createdAt: Date;
	completedAt?: Date;
	cityId?: string;
	purpose?: string;
}

/** Several runs of one workflow under one parent, folded into one node */
export interface AdminWorkflowTreeGroupDto {
	kind: 'group';
	/** `<parent id>/<className>.<name>` */
	id: string;
	parentKey: string;
	/** The run that started them, for the list of them (`?parent=<id>&name=<name>`) */
	parentId: string;
	name: string;
	className: string;
	count: number;
	statuses: { status: DurableWorkflowStatus; count: number }[];
}

export interface AdminWorkflowTreeOutputDto {
	/** The run the tree is drawn from */
	id: string;
	/** The runs above it, the top first */
	ancestors: AdminWorkflowTreeRunDto[];
	nodes: (AdminWorkflowTreeRunDto | AdminWorkflowTreeGroupDto)[];
	/** More runs were under it than were read */
	truncated: boolean;
}
