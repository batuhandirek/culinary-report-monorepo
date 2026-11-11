import { Controller, UseGuards } from '@nestjs/common';

import { TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import { AdminListBrandsInputDto, AdminListBrandsOutputDto } from '../dto/admin-brand-list.dto.js';
import { AdminBrandSummaryOutputDto, AdminGetBrandSummaryInputDto } from '../dto/admin-brand-summary.dto.js';
import { BrandListService } from '../services/brand-list.service.js';
import { BrandSummaryService } from '../services/brand-summary.service.js';

/** The Brands page and the brand page's Overview: figures read from every module, nothing stored. */
@Controller('/admin/brands')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminBrandListController {
	constructor(
		private readonly brandListService: BrandListService,
		private readonly brandSummaryService: BrandSummaryService,
	) {}

	/** Every brand with an open branch in the city, with the month's posts, reviews, sales stage and report. */
	@TypedRoute.Get('/')
	async listBrands(@TypedQuery() query: AdminListBrandsInputDto): Promise<AdminListBrandsOutputDto> {
		return this.brandListService.list(query);
	}

	/**
	 * One brand in numbers over a rolling window (the last 30 or 90 days, or twelve months) against
	 * the one before, six months of them, the window's best posts (each with its mention, to move to
	 * a branch) and what to do about it.
	 */
	@TypedRoute.Get('/:id/summary')
	async getBrandSummary(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedQuery() query: AdminGetBrandSummaryInputDto,
	): Promise<AdminBrandSummaryOutputDto> {
		return this.brandSummaryService.summary(id, query);
	}
}
