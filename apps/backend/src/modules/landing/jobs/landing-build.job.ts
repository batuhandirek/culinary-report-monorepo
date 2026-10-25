export type LandingBuildJobPayload = {
	cityId: string;
};

/**
 * Build a city's front page edition (`LandingEditionService.build`): queued by the daily cron
 * for a city whose newest edition is five days old, and by an admin's "Build now". One waits per
 * city (the queue is `stately`).
 */
export class LandingBuildJob {
	public static readonly jobName = 'landing-build';
	constructor(public payload: LandingBuildJobPayload) {}
}
