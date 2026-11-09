import type {
	AdminOutreachSummaryOutputDto,
	AdminProspectListItemOutputDto,
	AdminSuggestedProspectOutputDto,
} from 'src/modules/outreach/dto/admin-outreach.output.dto.js';

/** An operation's run (a DBOS workflow), as the morning view names it */
export interface AdminWorkflowRunOutputDto {
	workflowId: string;
	/** The workflow's name, `scrape-reviews.month` */
	workflow: string;
	/** DBOS's status: SUCCESS, ERROR, PENDING, ENQUEUED, CANCELLED, MAX_RECOVERY_ATTEMPTS_EXCEEDED */
	status: string;
	cityId?: string;
	/** The month, week or day it covers */
	period?: string;
	createdAt: Date;
	updatedAt?: Date;
	error?: string;
}

/**
 * The morning view: did the run work, what did it cost, who to write to today. Every figure is
 * `null` when its query failed, so the page shows "—" instead of a zero.
 */
export interface AdminOverviewOutputDto {
	/** The month the reports cover now: the one that just ended */
	reportMonth: string;
	/** The newest run of a month operation; `null` when there is none (or it failed to load) */
	lastMonthlyRun: AdminWorkflowRunOutputDto | null;
	/** The newest run of any pipeline operation, for when the monthly ones are old or missing */
	lastRun: AdminWorkflowRunOutputDto | null;
	/** When the month operations start next */
	nextMonthlyRunAt: Date;
	/** Apify spend this calendar month (UTC) */
	apifyMonthCostUsd: number | null;
	apifyMonthlyCreditUsd: number;
	/** Reports built for `reportMonth` */
	reportsBuilt: number | null;
	/** Mentions no venue fits yet (match method `none`) */
	unmatchedMentions: number | null;
	outreach: AdminOutreachSummaryOutputDto | null;
	/** Due by the end of today, the most overdue first */
	dueFollowUps: AdminProspectListItemOutputDto[] | null;
	/** The best lead scores not on the outreach list yet */
	suggestedProspects: AdminSuggestedProspectOutputDto[] | null;
}
