import type { BacklogStopReason } from '../entities/backlog-run.entity.js';

/** One backlog's day (`BacklogRun`) */
export interface AdminBacklogRunOutputDto {
	/** YYYY-MM-DD, UTC */
	day: string;
	batches: number;
	done: number;
	tokens?: number;
	stopReason?: BacklogStopReason;
	error?: string;
	remaining?: number;
	finishedAt?: Date;
}

export interface AdminLlmBacklogOutputDto {
	key: string;
	label: string;
	priority: number;
	/** Absent when counting failed */
	remaining?: number;
	doneLast7Days: number;
	tokensLast7Days: number;
	/** When a run last settled anything */
	lastMovedAt?: Date;
	/** The newest day's run */
	lastRun?: AdminBacklogRunOutputDto;
}

export interface AdminLlmBacklogsOutputDto {
	/** `LLM_BACKLOG_DAILY_TOKENS`: what a day's runs may spend over every backlog */
	dailyTokens: number;
	/** Reported by today's batches (UTC day) */
	spentToday: number;
	items: AdminLlmBacklogOutputDto[];
}

export interface AdminRunLlmBacklogsOutputDto {
	queued: boolean;
}
