import { tags } from 'typia';

import { ApifyRunStatusEnum } from 'src/modules/apify/entities/apify-run.entity.js';
import type { AdminCityRefOutputDto } from 'src/modules/cities/dto/admin-city.output.dto.js';
import { PaginatedResult } from 'src/shared/interfaces/paginated-result.interface.js';
import { PaginationRequest } from 'src/shared/interfaces/pagination-request.interface.js';

import { PipelineStepEnum } from '../constants/pipeline.constant.js';
import { PipelineRunStatusEnum } from '../entities/pipeline-run.entity.js';

export interface AdminPipelineRunOutputDto {
	id: string;
	createdAt: Date;
	city: AdminCityRefOutputDto;
	step: PipelineStepEnum;
	month: string;
	status: PipelineRunStatusEnum;
	params?: { budgetUsd?: number; top?: number; since?: string; onlyMissing?: boolean };
	result?: Record<string, unknown>;
	error?: string;
	startedAt?: Date;
	finishedAt?: Date;
	/** How often a backend restart cut it short and it went on where it stopped */
	resumes: number;
}

export interface AdminListPipelineRunsInputDto extends PaginationRequest {
	cityId?: string & tags.Format<'uuid'>;
}

export interface AdminListPipelineRunsOutputDto extends PaginatedResult<AdminPipelineRunOutputDto> {}

export interface AdminStartPipelineRunInputDto {
	cityId: string & tags.Format<'uuid'>;
	step: PipelineStepEnum;
	month: string & tags.Pattern<'^[0-9]{4}-[0-9]{2}$'>;
	/** Apify spending cap for the step, in USD. Ignored by the monthly run, which uses each step's default. */
	budgetUsd?: number & tags.Minimum<0> & tags.Maximum<100>;
	/** How many of the month's most talked-about venues the step covers; the city's default otherwise. */
	top?: number & tags.Type<'uint32'> & tags.Minimum<1> & tags.Maximum<200>;
	/** `SCRAPE_REVIEWS` only: scrape from this day instead of the month's first (a backfill) */
	since?: string & tags.Pattern<'^[0-9]{4}-[0-9]{2}-[0-9]{2}$'>;
	/** `MONTHLY` only: skip the paid steps that already succeeded for the month */
	onlyMissing?: boolean;
}

export interface AdminFillCompetitorsInputDto {
	cityId: string & tags.Format<'uuid'>;
	month: string & tags.Pattern<'^[0-9]{4}-[0-9]{2}$'>;
	/** How many of the month's most talked-about venues to cover. */
	top?: number & tags.Type<'uint32'> & tags.Minimum<1> & tags.Maximum<200>;
}

export interface AdminFillCompetitorsOutputDto {
	/** The month's report brands looked at */
	brands: number;
	/** Brands that had none and got some */
	filled: number;
	/** Competitors added in all */
	added: number;
	/** Brands that already had competitors, left as they were */
	skipped: number;
}

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
