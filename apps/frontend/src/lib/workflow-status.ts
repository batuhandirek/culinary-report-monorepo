// The durable workflows' statuses in words, which moves each allows, and how long a run
// took: the single source for the Workflows list, a run's page and the Money page's links.

export type WorkflowStatus =
	| 'PENDING'
	| 'ENQUEUED'
	| 'DELAYED'
	| 'SUCCESS'
	| 'ERROR'
	| 'CANCELLED'
	| 'MAX_RECOVERY_ATTEMPTS_EXCEEDED';

export const WORKFLOW_STATUS_LABELS: Record<WorkflowStatus, string> = {
	PENDING: 'Running',
	ENQUEUED: 'Queued',
	DELAYED: 'Delayed',
	SUCCESS: 'Succeeded',
	ERROR: 'Failed',
	CANCELLED: 'Cancelled',
	// A restart picked it up too often and DBOS stopped trying
	MAX_RECOVERY_ATTEMPTS_EXCEEDED: 'Gave up'
};

export const workflowStatusLabel = (status: string) =>
	WORKFLOW_STATUS_LABELS[status as WorkflowStatus] ?? status;

/** Still to finish: running, or waiting on its queue or its delay. */
export const isWorkflowLive = (status: string) =>
	status === 'PENDING' || status === 'ENQUEUED' || status === 'DELAYED';

/** Cancel stops it at its next step (and its children) and takes it off its queue. */
export const canCancelWorkflow = isWorkflowLive;

/** Resume runs a cancelled, failed or given-up run on from its last finished step. */
export const canResumeWorkflow = (status: string) =>
	status === 'CANCELLED' || status === 'ERROR' || status === 'MAX_RECOVERY_ATTEMPTS_EXCEEDED';

/** `850 ms`, `12 s`, `4 min 05 s`, `2 h 10 min`, `3 d 4 h`. */
export const formatDuration = (ms: number) => {
	if (ms < 1000) return `${Math.max(0, Math.round(ms))} ms`;
	const s = Math.round(ms / 1000);
	if (s < 60) return `${s} s`;
	const m = Math.floor(s / 60);
	if (m < 60) return `${m} min ${String(s % 60).padStart(2, '0')} s`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h} h ${String(m % 60).padStart(2, '0')} min`;
	return `${Math.floor(h / 24)} d ${h % 24} h`;
};

type Timed = {
	status: string;
	createdAt: string;
	dequeuedAt?: string;
	completedAt?: string;
	updatedAt?: string;
};

/** Still on its queue or its delay: not started yet. */
export const isWorkflowWaiting = (status: string) => status === 'ENQUEUED' || status === 'DELAYED';

/**
 * How long it ran: from leaving its queue (or being created) to finishing. A running run
 * counts to now, one still waiting has no time yet; an ended one without `completedAt`
 * counts to its last update.
 */
export const workflowDuration = (run: Timed, now = Date.now()): number | undefined => {
	if (isWorkflowWaiting(run.status)) return undefined;
	const start = new Date(run.dequeuedAt ?? run.createdAt).getTime();
	const end = run.completedAt
		? new Date(run.completedAt).getTime()
		: isWorkflowLive(run.status)
			? now
			: run.updatedAt
				? new Date(run.updatedAt).getTime()
				: undefined;
	return end === undefined ? undefined : end - start;
};

/** A step's own time, when it has both ends. */
export const stepDuration = (step: { startedAt?: string; completedAt?: string }) =>
	step.startedAt && step.completedAt
		? new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime()
		: undefined;

/** `IngestionWorkflows.ingestCity`, or the method alone where the class says nothing new. */
export const workflowTitle = (run: { className: string; name: string }) =>
	run.className ? `${run.className}.${run.name}` : run.name;

/** A run's page. */
export const workflowHref = (id: string) => `/admin/workflows/${encodeURIComponent(id)}`;
