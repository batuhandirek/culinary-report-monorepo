import { tags } from 'typia';

import type { PipelineStepEnum } from 'src/modules/pipeline/constants/pipeline.constant.js';
import type { StepState } from 'src/modules/pipeline/util/step-states.js';

export interface AdminGetDataCoverageInputDto {
	cityId: string & tags.Format<'uuid'>;
	/** How many months back from the current one; 6 without */
	months?: number & tags.Type<'uint32'> & tags.Minimum<1> & tags.Maximum<24>;
}

/** One step's latest attempt for a month; no `state` when it never ran for it. */
export interface AdminDataStepOutputDto {
	step: PipelineStepEnum;
	/** Spends on Apify: "finish the month" pays for it only when it has not succeeded */
	paid: boolean;
	state?: StepState;
	runId?: string;
	at?: Date;
	error?: string;
	/** Its result's figures in a line, e.g. "found 2000 · saved 412" */
	summary?: string;
}

export interface AdminDataMonthOutputDto {
	month: string;
	/** The current month: still filling up */
	inProgress: boolean;
	/** Every step of the monthly run succeeded (or was skipped as done) */
	complete: boolean;
	posts: { tiktok: number; instagram: number; unanalysed: number };
	mentions: { matched: number; unmatched: number; otherCity: number };
	reviews: { total: number; unanalysed: number; venues: number };
	reports: { built: number; sent: number };
	/** Apify spend of the month's pipeline runs (runs started before 2026-10-18 carry no run link) */
	apifyUsd: number;
	steps: AdminDataStepOutputDto[];
}

export interface AdminDataCoverageOutputDto {
	cityId: string;
	/** The month the monthly cron reports on now: the last finished one */
	reportMonth: string;
	/** Newest first */
	months: AdminDataMonthOutputDto[];
	/** Steps that run on their own schedule, whatever the month: their latest run */
	recurring: AdminDataStepOutputDto[];
	/** Runs waiting or running now */
	queue: { runId: string; step: PipelineStepEnum; month: string; state: 'queued' | 'running'; createdAt: Date }[];
}
