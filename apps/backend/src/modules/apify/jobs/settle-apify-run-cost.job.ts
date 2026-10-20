export type SettleApifyRunCostJobPayload = { apifyRunId: string };

/** Reads a finished run's cost again once Apify has settled it (`ApifyRun.id`, not Apify's id). */
export class SettleApifyRunCostJob {
	public static readonly jobName = 'settle-apify-run-cost';
	constructor(public payload: SettleApifyRunCostJobPayload) {}
}
