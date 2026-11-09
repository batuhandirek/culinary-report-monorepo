import { tags } from 'typia';

import type { PipelineStepEnum } from 'src/modules/pipeline/constants/pipeline.constant.js';

export interface AdminGetDataCoverageInputDto {
	cityId: string & tags.Format<'uuid'>;
	/** How many months back from the current one; 6 without */
	months?: number & tags.Type<'uint32'> & tags.Minimum<1> & tags.Maximum<24>;
}

/**
 * A step's state in its operation's run: `succeeded` (it finished), `failed` (it, or the run,
 * failed there), `running` (the run is in progress and has not finished it yet), `queued` (the
 * run waits on its queue). No state: it never ran for that period.
 */
export type StepState = 'succeeded' | 'failed' | 'running' | 'queued';

/** One step's latest attempt for a period; no `state` when it never ran for it. */
export interface AdminDataStepOutputDto {
	step: PipelineStepEnum;
	/** Spends on Apify */
	paid: boolean;
	state?: StepState;
	/** The operation's run it is in (`/admin/workflows/<id>`) */
	workflowId?: string;
	at?: Date;
	error?: string;
	/** Its result's figures in a line, e.g. "found 2000 · saved 412" */
	summary?: string;
}

export interface AdminDataMonthOutputDto {
	month: string;
	/** The current month: still filling up */
	inProgress: boolean;
	/** Every step of the month succeeded */
	complete: boolean;
	posts: { tiktok: number; instagram: number; blog: number; unanalysed: number };
	mentions: { matched: number; unmatched: number; otherCity: number };
	reviews: { total: number; unanalysed: number; venues: number };
	reports: { built: number; sent: number };
	/** Apify spend of the month's runs of the month operations (the actor runs inside them and their direct children) */
	apifyUsd: number;
	steps: AdminDataStepOutputDto[];
}

/** An operation's run waiting on its queue or running now */
export interface AdminDataQueuedRunOutputDto {
	workflowId: string;
	/** The workflow's name, `scrape-reviews.month` */
	workflow: string;
	/** The steps it runs (`STEP_RUNS_IN`) */
	steps: PipelineStepEnum[];
	/** The month, week or day it covers */
	period?: string;
	state: 'queued' | 'running';
	createdAt: Date;
}

export interface AdminDataCoverageOutputDto {
	cityId: string;
	/** The month the monthly runs cover now: the last finished one */
	reportMonth: string;
	/** Newest first */
	months: AdminDataMonthOutputDto[];
	/** Steps that run on their own schedule, whatever the month: their latest run */
	recurring: AdminDataStepOutputDto[];
	/** Runs waiting or running now */
	queue: AdminDataQueuedRunOutputDto[];
}
