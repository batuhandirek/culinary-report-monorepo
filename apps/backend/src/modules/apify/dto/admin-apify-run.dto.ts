import { PaginatedResult } from 'src/shared/interfaces/paginated-result.interface.js';
import { PaginationRequest } from 'src/shared/interfaces/pagination-request.interface.js';

import { ApifyRunStatusEnum } from '../entities/apify-run.entity.js';

export interface AdminApifyRunOutputDto {
	id: string;
	createdAt: Date;
	actorId: string;
	purpose: string;
	status: ApifyRunStatusEnum;
	apifyRunId?: string;
	maxCostUsd: number;
	costUsd?: number;
	itemCount?: number;
	finishedAt?: Date;
	error?: string;
}

export interface AdminListApifyRunsInputDto extends PaginationRequest {}

export interface AdminListApifyRunsOutputDto extends PaginatedResult<AdminApifyRunOutputDto> {
	/** What runs cost this calendar month, in USD. */
	monthCostUsd: number;
}

/** The account now: the cycle's limit, what it used, our running runs' caps, what is left */
export interface AdminApifyCreditOutputDto {
	limitUsd: number;
	usedUsd: number;
	cycleStart: Date;
	cycleEnd: Date;
	/** Our runs still going and their caps together, counted as spent until they end */
	runningRuns: number;
	runningCapsUsd: number;
	/** What new runs may still spend: limit − used − running caps */
	remainingUsd: number;
	readAt: Date;
	/** Actor runs waiting for credit (oldest first): woken by the refresher, `wake`, or the cycle's end */
	waiting: AdminApifyCreditWaiterOutputDto[];
}

export interface AdminApifyCreditWaiterOutputDto {
	/** The waiting actor-run workflow (`/admin/workflows/:id`) */
	workflowId: string;
	/** Its cap: what it needs left on the account */
	needUsd: number;
	purpose: string;
	since: Date;
}

/** What `wake` did: the waiting runs, and those the account covers now (woken; each checks again) */
export interface AdminApifyCreditWakeOutputDto {
	waiting: number;
	woken: number;
}
