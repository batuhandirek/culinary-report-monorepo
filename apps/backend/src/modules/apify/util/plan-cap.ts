/**
 * Wording actors use when the Free plan limits a run: apidojo ("Monthly run limit exceeded per
 * user", "Users with the Free Plan can retrieve a maximum of 10 items. Please subscribe to a
 * paid plan"), apify/instagram-scraper ("Hashtag scraper is limited to one page for free
 * users"), "[FREE_API_LIMIT] Free API runs are limited to …", "Free-plan sample limit". Checked
 * against the logs of every actor the pipeline uses: none prints it otherwise.
 */
const PLAN_LIMIT =
	/\bfree[ -](plan|users?|tier|accounts?|api)\b|\bpaid plan\b|\brun limit exceeded\b/i;

/**
 * What says the Free plan limited a run: its status message, else the first such line of its
 * log (timestamp and log level dropped). Such a run still ends SUCCEEDED. Null when nothing says so.
 */
export const planLimitNote = (
	statusMessage: string | null | undefined,
	log?: string | null,
): string | null => {
	if (statusMessage && PLAN_LIMIT.test(statusMessage)) return statusMessage.trim();
	const line = log?.split('\n').find(l => PLAN_LIMIT.test(l));
	if (!line) return null;
	return line
		.replace(/^\s*\d{4}-\d{2}-\d{2}T[\d:.]+Z\s*/, '')
		.replace(/^(\[apify\]\s*)?(INFO|WARN|WARNING|ERROR|DEBUG)\b:?\s*/i, '')
		.trim()
		.slice(0, 300);
};
