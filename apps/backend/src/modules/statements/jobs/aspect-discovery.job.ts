export interface AspectDiscoveryJobPayload {
	/** Name the groups and log what would be created, writing nothing */
	dryRun: boolean;
	/** Only the cities whose cron is on (the weekly run); a boot run takes every active city */
	cronOnly?: boolean;
}

/**
 * Aspect discovery over the cities (`AspectDiscoveryService.runAll`), queued weekly by
 * `AspectDiscoveryCron` and at boot while `ASPECT_DISCOVERY_ON_BOOT` is set. A `stately` queue with one `singletonKey`, never retried (a
 * run that failed half way is started again by the next boot: what it created is an aspect
 * already, so it is not created twice).
 */
export class AspectDiscoveryJob {
	public static readonly jobName = 'aspect-discovery';
	public static readonly singletonKey = 'once';
	constructor(public payload: AspectDiscoveryJobPayload) {}
}
