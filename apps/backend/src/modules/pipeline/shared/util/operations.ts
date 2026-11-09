import type { CityService } from 'src/modules/cities/services/city.service.js';
import type { DurablePriority } from 'src/modules/durable-workflows/constants/durable-priority.constant.js';
import type { DurableQueue } from 'src/modules/durable-workflows/interfaces/durable-workflows.interface.js';
import type { DurableWorkflowsService } from 'src/modules/durable-workflows/services/durable-workflows.service.js';

import { cronCities, type CronCity } from './cron-cities.js';

/**
 * How often an operation's run covers a city: a month (`YYYY-MM`), an ISO week (`YYYY-Www`, UTC),
 * a day (`YYYY-MM-DD`, UTC); `run` for one started by hand (its id is the caller's)
 */
export type Cadence = 'month' | 'week' | 'day';

/** An operation's run of one cadence, as a workflow (`@DurableWorkflow({ name: workflowName(…) })`) */
export interface OperationRun {
	/** The operation's folder name, `scrape-reviews` */
	operation: string;
	cadence: Cadence;
	queue: DurableQueue;
	/**
	 * Set only where a late run loses data for good: the post streams, whose sources only show
	 * recent posts (`POST_STREAM_PRIORITY`). Every start of the run passes it, its schedule's and a
	 * dependent operation's alike; without it a run takes its starter's level.
	 */
	priority?: DurablePriority;
}

/** The post streams' level: a run that waits behind others can miss posts that are gone the next day */
export const POST_STREAM_PRIORITY: DurablePriority = 'high';

/** The workflow's registered name: `scrape-reviews.month` */
export const workflowName = (operation: string, cadence: Cadence) => `${operation}.${cadence}`;

/**
 * A city's run of an operation for one period has one id (`scrape-reviews.month-<city>-2026-10`):
 * its own schedule and every operation depending on it start the same run, so the work is done
 * once, whoever asks first, and a finished one hands back its stored result
 */
export const operationRunId = (run: Omit<OperationRun, 'queue'>, cityId: string, period: string) =>
	`${workflowName(run.operation, run.cadence)}-${cityId}-${period}`;

/** The ISO week of a UTC day, `2026-W45` */
export const isoWeek = (at: Date): string => {
	const day = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
	const weekday = day.getUTCDay() || 7;
	day.setUTCDate(day.getUTCDate() + 4 - weekday);
	const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
	const week = Math.ceil(((day.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
	return `${day.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

/** The current period of a cadence at `now`: the month that just ended for `month` (what a monthly run covers) */
export const periodAt = (cadence: Cadence, now: Date): string => {
	if (cadence === 'day') return now.toISOString().slice(0, 10);
	if (cadence === 'week') return isoWeek(now);
	const previous = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
	return previous.toISOString().slice(0, 7);
};

type CityWorkflow<R> = (cityId: string, period: string) => Promise<R>;

/**
 * Starts the city's run of `workflow` for `period` (on its queue, under its one id,
 * `operationRunId`) and awaits its result. A schedule's run, a dependent operation's call: the
 * same run. From a workflow's body it is a child; never from inside a step.
 */
export const runOperation = async <R>(
	durable: Pick<DurableWorkflowsService, 'start'>,
	workflow: CityWorkflow<R>,
	run: OperationRun,
	cityId: string,
	period: string,
): Promise<R> => {
	const handle = await durable.start(workflow, [cityId, period], {
		queue: run.queue,
		workflowId: operationRunId(run, cityId, period),
		attributes: { cityId, purpose: run.operation, period },
		...(run.priority && { priority: run.priority }),
	});
	return handle.getResult();
};

/**
 * A schedule's whole body: the cron cities (a step), then each city's run of `workflow` for the
 * period at the schedule's time started under its one id (never awaited: each governs itself)
 */
export const startForCronCities = async <R>(
	durable: Pick<DurableWorkflowsService, 'step' | 'start'>,
	cityService: Pick<CityService, 'forMonthlyCron'>,
	workflow: CityWorkflow<R>,
	run: OperationRun,
	period: string,
	only: (city: CronCity) => boolean = () => true,
): Promise<void> => {
	for (const city of await cronCities(durable, cityService)) {
		if (!only(city)) continue;
		await durable.start(workflow, [city.id, period], {
			queue: run.queue,
			workflowId: operationRunId(run, city.id, period),
			attributes: { cityId: city.id, purpose: run.operation, period },
			...(run.priority && { priority: run.priority }),
		});
	}
};
