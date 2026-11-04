/** An admin's question is `done` when written; the analyst's answer goes queued → running → done | failed */
export enum AnalystMessageStatusEnum {
	QUEUED = 'queued',
	RUNNING = 'running',
	DONE = 'done',
	FAILED = 'failed',
}
