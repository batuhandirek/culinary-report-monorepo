/**
 * Set once the process got SIGTERM or SIGINT (a deploy, the dev watcher): from then on a start
 * Apify refused for memory is not tried again and the backlog drain ends its day (`shutdown`), so
 * the process that boots next — which may already be up while this one drains — resumes the work
 * alone (DBOS recovers the workflows this one let go of).
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
