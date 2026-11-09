/**
 * The next time the month operations start after `now`: the 2nd of every month, 06:00 UTC, for
 * the month that just ended (their schedules' `0 6 2 * *`). The overview's own copy, so it reads
 * no pipeline schedule file.
 */
export const nextMonthlyRunAt = (now = new Date()): Date => {
	const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 2, 6));
	return thisMonth > now ? thisMonth : (
			new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 2, 6))
		);
};
