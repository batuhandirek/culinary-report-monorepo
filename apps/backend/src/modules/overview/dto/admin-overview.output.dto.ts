import type {
	AdminOutreachSummaryOutputDto,
	AdminProspectListItemOutputDto,
	AdminSuggestedProspectOutputDto,
} from 'src/modules/outreach/dto/admin-outreach.output.dto.js';
import type { AdminPipelineRunOutputDto } from 'src/modules/pipeline/dto/admin-pipeline.output.dto.js';

/**
 * The morning view: did the run work, what did it cost, who to write to today. Every figure is
 * `null` when its query failed, so the page shows "—" instead of a zero.
 */
export interface AdminOverviewOutputDto {
	/** The month the reports cover now: the one that just ended */
	reportMonth: string;
	/** The newest `MONTHLY` run; `null` when there is none (or it failed to load) */
	lastMonthlyRun: AdminPipelineRunOutputDto | null;
	/** The newest run of any step, for when the monthly one is old or missing */
	lastRun: AdminPipelineRunOutputDto | null;
	/** When the cron queues the next monthly run */
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
