/** Metadata keys the decorators set and the scanner reads */
export const DURABLE_WORKFLOW_OPTIONS = 'DURABLE_WORKFLOW_OPTIONS';
export const DURABLE_STEP_OPTIONS = 'DURABLE_STEP_OPTIONS';
export const DURABLE_SCHEDULE_OPTIONS = 'DURABLE_SCHEDULE_OPTIONS';

export const DURABLE_WORKFLOWS_OPTIONS = Symbol('DURABLE_WORKFLOWS_OPTIONS');
export const DURABLE_WORKFLOWS_LOGGER = 'DurableWorkflows';

/** How long a shutdown waits for the workflows running in this process before it lets go of them (the next process resumes them) */
export const SHUTDOWN_DRAIN_MS = 30_000;
