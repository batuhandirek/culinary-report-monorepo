import { tags } from 'typia';

import { PaginatedResult } from 'src/shared/interfaces/paginated-result.interface.js';
import { PaginationRequest } from 'src/shared/interfaces/pagination-request.interface.js';

import type { ReportAnalysis } from '../interfaces/report-analysis.interface.js';
import type { ReportData, ReportHighlights } from '../interfaces/report-data.interface.js';
import type { ReportSectionDto } from '../interfaces/report-section.interface.js';

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
	/** Its configuration's (or the default template's) name at the build */
	name: string;
	/** The brand's configuration it was built for; absent for a default report or once deleted */
	config?: { id: string; name: string };
	/** The template behind it; absent for a custom configuration or once the template is deleted */
	template?: { id: string; name: string };
	/** When it was last e-mailed to the brand */
	sentAt?: Date;
}

/** Its configuration and template are named on the admin's routes only (not on the portal or a shared link). */
export interface AdminReportOutputDto extends Omit<AdminReportListItemOutputDto, 'headline'> {
	data: ReportData;
	highlights: ReportHighlights;
	/** What moved, and why it might have, with the admin's trace; absent for reports built before it */
	analysis?: ReportAnalysis;
	/** What it shows, in order: its type's sections as they were at the build */
	sections: ReportSectionDto[];
}

export interface AdminListReportsInputDto extends PaginationRequest {
	sort?: `${'updatedAt' | 'month' | 'postCount' | 'reviewCount'}:${'asc' | 'desc'}`;
	month?: Month;
	brandId?: string & tags.Format<'uuid'>;
	/** Reports on this city's branches */
	cityId?: string & tags.Format<'uuid'>;
	/** Reports made from this template */
	templateId?: string & tags.Format<'uuid'>;
	/** Reports of this configuration */
	configId?: string & tags.Format<'uuid'>;
}

export interface AdminListReportsOutputDto extends PaginatedResult<AdminReportListItemOutputDto> {}

export interface AdminBuildReportInputDto {
	brandId: string & tags.Format<'uuid'>;
	/** The city whose branches it covers; absent for the report across all the brand's cities */
	cityId?: string & tags.Format<'uuid'>;
	month: Month;
	/** Only this configuration's report (a rebuild); absent builds every active configuration's */
	configId?: string & tags.Format<'uuid'>;
}
