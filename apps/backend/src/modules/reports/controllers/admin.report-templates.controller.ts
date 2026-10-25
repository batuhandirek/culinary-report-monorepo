import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	AdminCreateReportTemplateInputDto,
	AdminReportTemplateOutputDto,
	AdminUpdateReportTemplateInputDto,
} from '../dto/admin-report-template.dto.js';
import type { ReportTemplate } from '../entities/report-template.entity.js';
import { ReportTemplateService } from '../services/report-template.service.js';
import { sectionsOutput } from '../util/report-sections.js';

type Uuid = string & tags.Format<'uuid'>;

const templateOutput = (
	template: ReportTemplate,
	brands: number,
): AdminReportTemplateOutputDto => ({
	id: template.id,
	name: template.name,
	...(template.description && { description: template.description }),
	isDefault: template.isDefault,
	sections: sectionsOutput(template.sections),
	brands,
	createdAt: template.createdAt,
	updatedAt: template.updatedAt,
});

/** Ready-made report layouts, copied into brands' configurations. */
@Controller('/admin/report-templates')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminReportTemplatesController {
	constructor(private readonly reportTemplateService: ReportTemplateService) {}

	@TypedRoute.Get('/')
	async listReportTemplates(): Promise<AdminReportTemplateOutputDto[]> {
		return (await this.reportTemplateService.list()).map(({ template, brands }) =>
			templateOutput(template, brands),
		);
	}

	@TypedRoute.Get('/:id')
	async getReportTemplate(@TypedParam('id') id: Uuid): Promise<AdminReportTemplateOutputDto> {
		return this.output(await this.reportTemplateService.get(id));
	}

	@TypedRoute.Post('/')
	async createReportTemplate(
		@TypedBody() body: AdminCreateReportTemplateInputDto,
	): Promise<AdminReportTemplateOutputDto> {
		return this.output(await this.reportTemplateService.create(body));
	}

	/** Changes the template; configurations already copied from it keep their sections. */
	@TypedRoute.Patch('/:id')
	async updateReportTemplate(
		@TypedParam('id') id: Uuid,
		@TypedBody() body: AdminUpdateReportTemplateInputDto,
	): Promise<AdminReportTemplateOutputDto> {
		return this.output(await this.reportTemplateService.update(id, body));
	}

	/** Makes it what brands without an active configuration get. */
	@TypedRoute.Post('/:id/default')
	async setDefaultReportTemplate(
		@TypedParam('id') id: Uuid,
	): Promise<AdminReportTemplateOutputDto> {
		return this.output(await this.reportTemplateService.setDefault(id));
	}

	/** Deletes a template that is not the default; its configurations and reports keep theirs, the link null. */
	@TypedRoute.Delete('/:id')
	async deleteReportTemplate(@TypedParam('id') id: Uuid): Promise<void> {
		await this.reportTemplateService.remove(id);
	}

	private async output(template: ReportTemplate): Promise<AdminReportTemplateOutputDto> {
		return templateOutput(template, await this.reportTemplateService.brandCount(template.id));
	}
}
