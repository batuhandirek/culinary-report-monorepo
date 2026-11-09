import type { AdminReportRunOutputDto } from 'client';

import { goto } from '$app/navigation';
import { atShort } from '#components/admin/admin-format.js';
import { api } from '#lib/api.js';
import { workflowHref } from '#lib/workflow-status.js';
import { notificationManager } from '#ui/lib/notification-manager.js';

// An admin's report build or "Analyse again" runs in the background (a durable workflow on the
// `reports` queue): the route starts it and hands back the run, which is followed here until it
// names its reports. A run that waits for an LLM account (none can serve its agents until the
// daily reset) goes on by itself, so the page stops following it and says so, with a link to it.

const POLL_MS = 3000;
// A build takes a few minutes at most (each agent call is capped at 8); past this the run is left to Workflows
const FOLLOW_MS = 20 * 60_000;

/** Follows a run while it is queued or running: what it is once done, failed, waiting, or past `FOLLOW_MS`. */
export const followReportRun = async (
	run: AdminReportRunOutputDto
): Promise<AdminReportRunOutputDto> => {
	const until = Date.now() + FOLLOW_MS;
	while ((run.state === 'queued' || run.state === 'running') && Date.now() < until) {
		await new Promise((resolve) => setTimeout(resolve, POLL_MS));
		run = await api.admin.getReportRun(run.workflowId);
	}
	return run;
};

/**
 * Says how a followed run ended: `done` (the caller's words) when it wrote its reports, else
 * why it hasn't yet, with a button to its run. True when it is done.
 */
export const announceReportRun = (
	run: AdminReportRunOutputDto,
	done: { title: string; text?: string }
): boolean => {
	const openRun = { label: 'Open run', onClick: () => goto(workflowHref(run.workflowId)) };
	switch (run.state) {
		case 'done':
			notificationManager.addNotification({ ...done, success: true });
			return true;
		case 'waiting':
			notificationManager.addNotification({
				title: 'Waiting for an LLM account',
				text: `No account can serve ${run.wait?.agentId ?? 'its agents'} until ${atShort(
					run.wait?.until ?? run.wait?.wakeAt
				)}. It goes on by itself then.`,
				info: true,
				time: 20_000,
				action: openRun
			});
			return false;
		case 'failed':
			notificationManager.addNotification({
				title: 'The run failed',
				text: run.error,
				error: true,
				time: 20_000,
				action: openRun
			});
			return false;
		default:
			notificationManager.addNotification({
				title: 'Still running',
				text: 'It goes on in the background; its run is on Workflows.',
				info: true,
				time: 20_000,
				action: openRun
			});
			return false;
	}
};
