/** Metadata keys the decorators set and the scanner reads */
export const DURABLE_WORKFLOW_OPTIONS = 'DURABLE_WORKFLOW_OPTIONS';
export const DURABLE_STEP_OPTIONS = 'DURABLE_STEP_OPTIONS';
export const DURABLE_SCHEDULE_OPTIONS = 'DURABLE_SCHEDULE_OPTIONS';

export const DURABLE_WORKFLOWS_OPTIONS = Symbol('DURABLE_WORKFLOWS_OPTIONS');
export const DURABLE_WORKFLOWS_LOGGER = 'DurableWorkflows';

/** How long a shutdown waits for the workflows running in this process before it lets go of them (the next process resumes them) */
export const SHUTDOWN_DRAIN_MS = 30_000;

/**
 * The `keepDays` of the runs that only carry one item (one review's or post's reading, one agent
 * call, a reading sweep, an hourly firing): long enough to look at a day's runs on
 * `/admin/workflows`, short enough that DBOS stays at a few days of reading
 */
export const ITEM_RUN_KEEP_DAYS = 3;

/** A cancelled or failed run is kept at least this long, so an admin can still resume it */
export const DURABLE_PRUNE_FAILED_KEEP_DAYS = 14;

/** Runs a prune step looks at; the ones it may delete go in one `DBOS.deleteWorkflows` */
export const DURABLE_PRUNE_BATCH = 1_000;

/** Batches one firing goes through at most (the rest waits a day) */
export const DURABLE_PRUNE_MAX_BATCHES = 500;

/** Daily, after the night's reading (00:00 to ~07:00 UTC) */
export const DURABLE_PRUNE_CRON = '20 9 * * *';

/** Metadata key of `@BeforeDurableLaunch()` */
export const DURABLE_BEFORE_LAUNCH = 'DURABLE_BEFORE_LAUNCH';
