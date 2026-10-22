import { FilterQuery, QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Controller, Get, Param, ParseUUIDPipe, Res, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import type { Response } from 'express';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { AuthenticatedUserId } from 'src/modules/auth/decorators/authenticated-user-id.decorator.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';
import { User } from 'src/modules/auth/entities/user.entity.js';

import {
	AdminBuildReportInputDto,
	AdminListReportsInputDto,
	AdminListReportsOutputDto,
	AdminReportListItemOutputDto,
	AdminReportOutputDto,
} from '../dto/admin-report.output.dto.js';
import { Report } from '../entities/report.entity.js';
import { ReportService } from '../services/report.service.js';
import { ReportPdfService } from '../services/report-pdf.service.js';
import { ReportShareService, shareUrl } from '../services/report-share.service.js';
import { leaveBehindData } from '../util/leave-behind.js';

const refs = (report: Pick<Report, 'brand' | 'city'>) => ({
	brand: { id: report.brand.id, name: report.brand.name },
	...(report.city && { city: { id: report.city.id, name: report.city.name, slug: report.city.slug } }),
});

/** A report's file name: the brand, the city (none across cities) and the month. */
export const reportFileName = (report: AdminReportOutputDto) =>
	[report.brand.name, report.city?.name, report.month]
		.filter(Boolean)
		.join('-')
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-|-$/g, '');

/** A report as the API returns it, to admins and through a private link alike. */
export const toOutput = (report: Report): AdminReportOutputDto => ({
	id: report.id,
	month: report.month,
	createdAt: report.createdAt,
	updatedAt: report.updatedAt,
	postCount: report.postCount,
	reviewCount: report.reviewCount,
	...refs(report),
	data: report.data,
	highlights: report.highlights,
	sentAt: report.sentAt ?? undefined,
});

@Controller('/admin/reports')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminReportsController {
	constructor(
		private readonly em: EntityManager,
		private readonly reportService: ReportService,
		private readonly reportPdfService: ReportPdfService,
		private readonly reportShareService: ReportShareService,
	) {}

	@TypedRoute.Get('/')
	async listReports(
		@TypedQuery() query: AdminListReportsInputDto,
	): Promise<AdminListReportsOutputDto> {
		const filters: FilterQuery<Report> = {};
		if (query.month) filters.month = query.month;
		if (query.brandId) filters.brand = query.brandId;
		if (query.cityId) filters.city = query.cityId;
		const [field, order] = (query.sort ?? 'updatedAt:desc').split(':') as [
			keyof Report,
			'asc' | 'desc',
		];
		const [items, totalItems] = await this.em.findAndCount(Report, filters, {
			populate: ['brand', 'city'],
			// The report body is big; the list needs the headline only
			exclude: ['data'],
			orderBy: { [field]: order === 'asc' ? QueryOrder.ASC : QueryOrder.DESC },
			offset: (query.page - 1) * query.size,
			limit: query.size,
		});
		return {
			items: items.map((report): AdminReportListItemOutputDto => ({
				id: report.id,
				month: report.month,
				createdAt: report.createdAt,
				updatedAt: report.updatedAt,
				postCount: report.postCount,
				reviewCount: report.reviewCount,
				...refs(report),
				headline: report.highlights.headline,
				...(report.sentAt && { sentAt: report.sentAt }),
			})),
			totalItems,
			page: query.page,
			pageSize: query.size,
		};
	}

	@TypedRoute.Get('/:id')
	async getReport(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
	): Promise<AdminReportOutputDto> {
		return toOutput(await this.em.findOneOrFail(Report, { id }, { populate: ['brand', 'city'] }));
	}

	/** The report as an A4 PDF, for downloading. Takes a few seconds: headless Chrome prints it. */
	@Get('/:id/pdf')
	async getReportPdf(
		@Param('id', ParseUUIDPipe) id: string,
		@Res() res: Response,
	): Promise<void> {
		const report = toOutput(
			await this.em.findOneOrFail(Report, { id }, { populate: ['brand', 'city'] }),
		);
		const pdf = await this.reportPdfService.render(report);
		const name = reportFileName(report);
		res.setHeader('Content-Type', 'application/pdf');
		res.setHeader(
			'Content-Disposition',
			`attachment; filename="report-${report.month}.pdf"; filename*=UTF-8''${encodeURIComponent(name)}.pdf`,
		);
		res.send(Buffer.from(pdf));
	}

	/**
	 * The A5 leave-behind for a visit: the cover title, headline and three findings with a QR code to
	 * the report's live share link (made if there is none), so a scan counts as an open, and the
	 * printing admin's name and e-mail. Takes a few seconds: headless Chrome prints it.
	 */
	@Get('/:id/leave-behind.pdf')
	async getReportLeaveBehindPdf(
		@Param('id', ParseUUIDPipe) id: string,
		@AuthenticatedUserId() adminId: string,
		@Res() res: Response,
	): Promise<void> {
		const report = await this.em.findOneOrFail(Report, { id }, { populate: ['brand', 'city'] });
		const admin = await this.em.findOneOrFail(User, { id: adminId });
		const share = await this.reportShareService.ensureShare(report.id, adminId);
		const pdf = await this.reportPdfService.renderLeaveBehind(
			leaveBehindData(report, shareUrl(share.token), {
				name: [admin.firstName, admin.lastName].filter(Boolean).join(' '),
				...(admin.email && { email: admin.email }),
				...(admin.mobileNumber && { phone: admin.mobileNumber }),
			}),
		);
		const name = reportFileName(toOutput(report));
		res.setHeader('Content-Type', 'application/pdf');
		res.setHeader(
			'Content-Disposition',
			`attachment; filename="leave-behind-${report.month}.pdf"; filename*=UTF-8''${encodeURIComponent(`${name}-leave-behind`)}.pdf`,
		);
		res.send(Buffer.from(pdf));
	}

	/** Builds (or rebuilds) a brand's report on its branches in a city, or (no `cityId`) in all its cities, for a month. Takes a few seconds: two LLM calls. */
	@TypedRoute.Post('/')
	async buildReport(@TypedBody() body: AdminBuildReportInputDto): Promise<AdminReportOutputDto> {
		const report = await this.reportService.build(body.brandId, body.cityId ?? null, body.month);
		await this.em.populate(report, ['brand', 'city']);
		return toOutput(report);
	}
}
