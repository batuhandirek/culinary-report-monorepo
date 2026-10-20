import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Which pipeline step an actor run belongs to. `PipelineService.execute` sets it around each
 * step, so `ApifyService.runActor` can tag the runs it starts and, when a step is resumed after
 * a backend restart, re-attach to the run it already paid for instead of starting another.
 */
export interface ApifyRunContext {
	pipelineRunId: string;
	// The step's key in the run's result, e.g. "4. MATCH_MENTIONS"
	stepKey: string;
}

export const apifyRunContext = new AsyncLocalStorage<ApifyRunContext>();

/**
 * Set once the process got SIGTERM or SIGINT (a deploy, the dev watcher): from then on no paid
 * actor run and no pipeline step starts, so the process that boots next — which may already be
 * up while this one drains — resumes the work alone (`PipelineRecoveryService`).
 */
export const processShutdown = { requested: false };

let watchingShutdown = false;
export const watchProcessShutdown = () => {
	if (watchingShutdown) return;
	watchingShutdown = true;
	for (const signal of ['SIGTERM', 'SIGINT'] as const) {
		process.once(signal, () => {
			processShutdown.requested = true;
		});
	}
};

export class ShuttingDownError extends Error {
	constructor() {
		super('The backend is shutting down: the run goes on after the restart');
		this.name = 'ShuttingDownError';
	}
}
