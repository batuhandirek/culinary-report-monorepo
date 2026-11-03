export interface AspectDiscoveryJobPayload {
	/** Name the groups and log what would be created, writing nothing */
	dryRun: boolean;
}

/**
 * Aspect discovery over every active city (`AspectDiscoveryService.runAll`), queued at boot while
 * `ASPECT_DISCOVERY_ON_BOOT` is set. A `stately` queue with one `singletonKey`, never retried (a
 * run that failed half way is started again by the next boot: what it created is an aspect
 * already, so it is not created twice).
 */
export class AspectDiscoveryJob {
	public static readonly jobName = 'aspect-discovery';
	public static readonly singletonKey = 'once';
	constructor(public payload: AspectDiscoveryJobPayload) {}
}
