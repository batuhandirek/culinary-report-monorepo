import { api } from '#lib/api.js';
import { isWorkflowLive } from '#lib/workflow-status.js';

// A run an admin started from a page and waits on ("Scrape now", "Re-analyse", "Refresh from
// Google"): read again every few seconds until it ends or the page stops waiting, so the page can
// reload what it wrote. A run past the wait goes on by itself on `/admin/workflows`.

const POLL_MS = 3000;

export type FollowedRun = { status: 'done' } | { status: 'failed'; error: string } | { status: 'still running' };

/** Follows run `id` for at most `waitMs`: done, failed (with why) or still running. */
export const followWorkflow = async (id: string, waitMs: number): Promise<FollowedRun> => {
	const until = Date.now() + waitMs;
	while (Date.now() < until) {
		await new Promise((resolve) => setTimeout(resolve, POLL_MS));
		const run = await api.admin.getWorkflow(id);
		const status = String(run.status);
		if (isWorkflowLive(status)) continue;
		return status === 'SUCCESS'
			? { status: 'done' }
			: { status: 'failed', error: run.error ?? `It ended ${status.toLowerCase().replaceAll('_', ' ')}` };
	}
	return { status: 'still running' };
};
