/**
 * How soon a run is taken from its queue. A `high` run passes every `normal` and `low` one waiting
 * on the same queue, and so does everything it starts: its actor runs, agent calls, atoms and
 * dependencies inherit the level (`StartOptions.priority`).
 */
export const DURABLE_PRIORITIES = ['high', 'normal', 'low'] as const;
export type DurablePriority = (typeof DURABLE_PRIORITIES)[number];

/** What a run gets when neither its starter nor a parent says: a schedule's firing, plain code */
export const DEFAULT_DURABLE_PRIORITY: DurablePriority = 'normal';

/**
 * DBOS's number for each level (every queue is dequeued by priority ascending, then oldest first).
 * None is 0, DBOS's default for a run started outside the facade (a fork, a schedule's firing):
 * such a run is read as `normal` by the runs it starts.
 */
export const DURABLE_PRIORITY_RANK: Record<DurablePriority, number> = {
	high: 1,
	normal: 50,
	low: 100,
};

/** The workflow attribute every run started through the facade carries its level in: DBOS keeps a priority number only for a queued run, and a child reads its parent's level from here */
export const DURABLE_PRIORITY_ATTRIBUTE = 'priority';

export const isDurablePriority = (value: unknown): value is DurablePriority =>
	typeof value === 'string' && (DURABLE_PRIORITIES as readonly string[]).includes(value);
