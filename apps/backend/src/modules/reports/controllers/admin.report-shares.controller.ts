import { wrap } from '@mikro-orm/core';

import { Controller, UseGuards } from '@nestjs/common';

import { TypedParam, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { AuthenticatedUserId } from 'src/modules/auth/decorators/authenticated-user-id.decorator.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import { AdminReportShareOutputDto } from '../dto/report-share.output.dto.js';
import { ReportShare } from '../entities/report-share.entity.js';
import { ReportShareService, shareUrl } from '../services/report-share.service.js';

const toShareOutput = (share: ReportShare): AdminReportShareOutputDto => ({
	...(wrap(share).serialize({
		skipNull: true,
		forceObject: true,
		populate: ['createdBy'],
	}) as unknown as Omit<AdminReportShareOutputDto, 'url'>),
	url: shareUrl(share.token),
});

/** Private links to a report (`/r/<token>`): made, listed with their opens, and revoked here. */
@Controller('/admin/reports')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminReportSharesController {
	constructor(private readonly reportShareService: ReportShareService) {}

	/** Newest first, revoked ones included. */
	@TypedRoute.Get('/:id/shares')
	async listReportShares(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
	): Promise<AdminReportShareOutputDto[]> {
		return (await this.reportShareService.list(id)).map(toShareOutput);
	}

	/** A new link; each recipient can get their own, so their opens count apart. */
	@TypedRoute.Post('/:id/shares')
	async createReportShare(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@AuthenticatedUserId() userId: string,
	): Promise<AdminReportShareOutputDto> {
		const share = await this.reportShareService.create(id, userId);
		return toShareOutput(share);
	}

	/** Turns a link off: it answers 404 from then on. */
	@TypedRoute.Delete('/:id/shares/:shareId')
	async revokeReportShare(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedParam('shareId') shareId: string & tags.Format<'uuid'>,
	): Promise<AdminReportShareOutputDto> {
		return toShareOutput(await this.reportShareService.revoke(id, shareId));
	}
}
