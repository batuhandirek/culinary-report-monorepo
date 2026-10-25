import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	AdminCreateReportConfigInputDto,
	AdminReportConfigOutputDto,
	AdminUpdateReportConfigInputDto,
} from '../dto/admin-report-template.dto.js';
import type { BrandReportConfig } from '../entities/brand-report-config.entity.js';
import { ReportConfigService } from '../services/report-config.service.js';
import { sectionsOutput } from '../util/report-sections.js';

type Uuid = string & tags.Format<'uuid'>;

const configOutput = (config: BrandReportConfig): AdminReportConfigOutputDto => ({
	id: config.id,
	brandId: config.brand.id,
	name: config.name,
	status: config.status,
	...(config.template && { template: { id: config.template.id, name: config.template.name } }),
	sections: sectionsOutput(config.sections),
	createdAt: config.createdAt,
	updatedAt: config.updatedAt,
});

/** A brand's report configurations: each a report it gets every month while active. */
@Controller('/admin')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminReportConfigsController {
	constructor(private readonly reportConfigService: ReportConfigService) {}

	@TypedRoute.Get('/brands/:brandId/report-configs')
	async listBrandReportConfigs(
		@TypedParam('brandId') brandId: Uuid,
	): Promise<AdminReportConfigOutputDto[]> {
		return (await this.reportConfigService.list(brandId)).map(configOutput);
	}

	/** A copy of a template (or a custom one, from the full layout) for the brand. */
	@TypedRoute.Post('/brands/:brandId/report-configs')
	async createBrandReportConfig(
		@TypedParam('brandId') brandId: Uuid,
		@TypedBody() body: AdminCreateReportConfigInputDto,
	): Promise<AdminReportConfigOutputDto> {
		const config = await this.reportConfigService.create(brandId, body);
		return configOutput(await this.reportConfigService.get(config.id));
	}

	@TypedRoute.Get('/report-configs/:id')
	async getReportConfig(@TypedParam('id') id: Uuid): Promise<AdminReportConfigOutputDto> {
		return configOutput(await this.reportConfigService.get(id));
	}

	/** Renames it, changes its sections or switches it on or off; built reports keep theirs. */
	@TypedRoute.Patch('/report-configs/:id')
	async updateReportConfig(
		@TypedParam('id') id: Uuid,
		@TypedBody() body: AdminUpdateReportConfigInputDto,
	): Promise<AdminReportConfigOutputDto> {
		return configOutput(await this.reportConfigService.update(id, body));
	}

	/** Deletes it; its reports stay, the link null. */
	@TypedRoute.Delete('/report-configs/:id')
	async deleteReportConfig(@TypedParam('id') id: Uuid): Promise<void> {
		await this.reportConfigService.remove(id);
	}
}
