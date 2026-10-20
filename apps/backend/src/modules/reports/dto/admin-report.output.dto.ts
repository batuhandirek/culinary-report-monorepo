import { tags } from 'typia';

import { PaginatedResult } from 'src/shared/interfaces/paginated-result.interface.js';
import { PaginationRequest } from 'src/shared/interfaces/pagination-request.interface.js';

import type { ReportData, ReportHighlights } from '../interfaces/report-data.interface.js';

type Month = string & tags.Pattern<'^[0-9]{4}-[0-9]{2}$'>;

export interface AdminReportListItemOutputDto {
	id: string;
	month: string;
	createdAt: Date;
	updatedAt: Date;
	postCount: number;
	reviewCount: number;
	/** The business it is on */
	brand: { id: string; name: string };
	/** The city its branches are in; absent for a report across all the brand's cities */
	city?: { id: string; name: string; slug: string };
	headline: string;
	/** When it was last e-mailed to the brand */
	sentAt?: Date;
}

export interface AdminReportOutputDto extends Omit<AdminReportListItemOutputDto, 'headline'> {
	data: ReportData;
	highlights: ReportHighlights;
}

export interface AdminListReportsInputDto extends PaginationRequest {
	sort?: `${'updatedAt' | 'month' | 'postCount' | 'reviewCount'}:${'asc' | 'desc'}`;
	month?: Month;
	brandId?: string & tags.Format<'uuid'>;
	/** Reports on this city's branches */
	cityId?: string & tags.Format<'uuid'>;
}

export interface AdminListReportsOutputDto extends PaginatedResult<AdminReportListItemOutputDto> {}

export interface AdminBuildReportInputDto {
	brandId: string & tags.Format<'uuid'>;
	/** The city whose branches it covers; absent for the report across all the brand's cities */
	cityId?: string & tags.Format<'uuid'>;
	month: Month;
}
