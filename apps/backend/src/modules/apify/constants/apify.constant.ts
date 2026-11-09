import type { WorkflowRef } from 'src/modules/durable-workflows/interfaces/durable-workflows.interface.js';

/**
 * The account's monthly usage limit as set on Apify (the Today page's figure; the live one is
 * `ApifyService.credit`): what all actor runs of a cycle may spend together.
 */
export const APIFY_MONTHLY_CREDIT_USD = 250;

/** How often an actor run workflow asks Apify whether the run finished */
export const APIFY_POLL_MS = 15_000;

/**
 * An actor run short of credit waits on this topic (`durable.recv`) until the refresher wakes it
 * (`ApifyCreditSchedule`, or an admin's "wake" after buying credit) or Apify's cycle ends
 */
export const APIFY_CREDIT_TOPIC = 'apify-credit';

/** The event a run publishes while it waits for credit (`ApifyCreditWait`), cleared when it goes on */
export const APIFY_CREDIT_WAIT_EVENT = 'apify-credit-wait';

/** How often the refresher looks for runs waiting for credit; it reads the account only when one waits */
export const APIFY_CREDIT_CHECK_CRON = '*/15 * * * *';

/** A waiting run wakes this long after Apify's cycle ends, so the new cycle has started on Apify's side */
export const APIFY_CYCLE_GRACE_SECONDS = 300;

/**
 * Actor runs at once across the whole app (`APIFY_QUEUE`): the Free plan's 16 GB of actor memory
 * holds about four of the pipeline's actors (1-4 GB each); a start Apify still refuses waits
 * (`startWhenMemoryFrees`)
 */
export const APIFY_QUEUE_CONCURRENCY = 4;

/** `ApifyWorkflows.runActor` by name, for `ApifyService.runActor` (the workflow depends on the service) */
export const APIFY_RUN_ACTOR_WORKFLOW: WorkflowRef = {
	className: 'ApifyWorkflows',
	name: 'runActor',
};
