/** What a run waiting for credit publishes (`APIFY_CREDIT_WAIT_EVENT`) */
export interface ApifyCreditWait {
	/** The run's cap: what it needs left on the account */
	needUsd: number;
	purpose: string;
	/** When it started waiting, and when Apify's cycle ends (it wakes then by itself) */
	since: string;
	until: string;
}

/** A waiting run, as the refresher finds it */
export interface ApifyCreditWaiter extends ApifyCreditWait {
	workflowId: string;
}

/**
 * The waiting runs `remainingUsd` covers, the longest waiting first, as long as their caps fit
 * together: woken, each checks the account again itself, so a wrong guess only costs a check
 */
export const wakeableWaiters = (
	waiters: ApifyCreditWaiter[],
	remainingUsd: number | null,
): ApifyCreditWaiter[] => {
	if (remainingUsd === null) return [];
	let room = remainingUsd;
	const woken: ApifyCreditWaiter[] = [];
	for (const waiter of [...waiters].sort((a, b) => a.since.localeCompare(b.since))) {
		if (waiter.needUsd > room) continue;
		room -= waiter.needUsd;
		woken.push(waiter);
	}
	return woken;
};
