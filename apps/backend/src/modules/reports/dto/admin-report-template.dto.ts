import { tags } from 'typia';

import type { ReportConfigStatusEnum } from '../constants/report-section.constant.js';
import type { ReportSectionDto } from '../interfaces/report-section.interface.js';

type Name = string & tags.MinLength<1> & tags.MaxLength<80>;

export interface AdminReportTemplateOutputDto {
	id: string;
	name: string;
	description?: string;
	/** What brands without an active configuration get */
	isDefault: boolean;
	sections: ReportSectionDto[];
	/** Brands with a configuration copied from it */
	brands: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface AdminCreateReportTemplateInputDto {
	name: Name;
	description?: string & tags.MaxLength<400>;
	/** The cover first, each kind once; absent starts from the full layout */
	sections?: ReportSectionDto[] & tags.MinItems<1>;
}

export interface AdminUpdateReportTemplateInputDto {
	name?: Name;
	description?: (string & tags.MaxLength<400>) | null;
	/** The cover first, each kind once */
	sections?: ReportSectionDto[] & tags.MinItems<1>;
}

export interface AdminReportConfigOutputDto {
	id: string;
	brandId: string;
	name: string;
	/** Inactive: not built until switched back on */
	status: ReportConfigStatusEnum;
	/** The template it was copied from; absent for a custom one or once that template is deleted */
	template?: { id: string; name: string };
	sections: ReportSectionDto[];
	createdAt: Date;
	updatedAt: Date;
}

export interface AdminCreateReportConfigInputDto {
	/** The template to copy; absent for a custom configuration starting from the full layout */
	templateId?: string & tags.Format<'uuid'>;
	/** Absent: the template's name (numbered when the brand has it already) */
	name?: Name;
}

export interface AdminUpdateReportConfigInputDto {
	name?: Name;
	/** The cover first, each kind once */
	sections?: ReportSectionDto[] & tags.MinItems<1>;
	status?: ReportConfigStatusEnum;
}
