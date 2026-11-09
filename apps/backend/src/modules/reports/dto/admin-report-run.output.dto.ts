/** Where a report run is: on its queue, running, waiting for an LLM account, done or failed */
export type ReportRunState = 'queued' | 'running' | 'waiting' | 'done' | 'failed';

/** A report build or "Analyse again", which runs in the background (`ReportBuildWorkflow`) */
export interface AdminReportRunOutputDto {
	/** The run's id: its page is `/admin/workflows/<id>` */
	workflowId: string;
	state: ReportRunState;
	/** Done: the reports it wrote, the first the one to open */
	reportIds?: string[];
	/** Failed: why */
	error?: string;
	/** Waiting: no LLM account can serve one of its agents until the roster's reset */
	wait?: AdminReportRunWaitOutputDto;
}

export interface AdminReportRunWaitOutputDto {
	/** The agent no account can serve */
	agentId: string;
	reason: string;
	/** When the roster says it serves again; absent when it names no end */
	until?: Date;
	/** When the run looks again */
	wakeAt: Date;
}
