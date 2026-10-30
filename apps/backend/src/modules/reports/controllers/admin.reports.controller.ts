import { FilterQuery, QueryOrder, wrap } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Controller, Get, Param, ParseUUIDPipe, Res, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import type { Response } from 'express';
import _ from 'lodash';
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
import { SharedReportOutputDto } from '../dto/report-share.output.dto.js';
import { Report } from '../entities/report.entity.js';
import type { ReportData } from '../interfaces/report-data.interface.js';
import { ReportService } from '../services/report.service.js';
import { ReportPdfService } from '../services/report-pdf.service.js';
import { ReportShareService, shareUrl } from '../services/report-share.service.js';
import { leaveBehindData } from '../util/leave-behind.js';
import { sectionsOutput } from '../util/report-sections.js';

const refs = (report: Pick<Report, 'brand' | 'city'>) => ({
	brand: { id: report.brand.id, name: report.brand.name },
	...(report.city && { city: { id: report.city.id, name: report.city.name, slug: report.city.slug } }),
});

/** A report's file name: the brand, the city (none across cities) and the month. */
export const reportFileName = (report: SharedReportOutputDto) =>
	[report.brand.name, report.city?.name, report.month]
		.filter(Boolean)
		.join('-')
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-|-$/g, '');

/** A report's configuration and template, when loaded. */
const links = (report: Pick<Report, 'config' | 'template'>) => ({
	...(report.config && wrap(report.config).isInitialized() && { config: { id: report.config.id, name: report.config.name } }),
	...(report.template &&
		wrap(report.template).isInitialized() && { template: { id: report.template.id, name: report.template.name } }),
});

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
	...(report.analysis && { analysis: report.analysis }),
	name: report.name,
	sections: sectionsOutput(report.sections),
	// Named where they were loaded (the admin's routes)
	...links(report),
	sentAt: report.sentAt ?? undefined,
});

/**
 * A report for a shared link or the portal: the admin's output without the delivery record and
 * without the analysis's trace (the admin's: tool calls, the model's notes, problems). Stripped
 * here, not by the DTO alone, since the print page gets the object as is.
 */
export const toPublicOutput = (report: Report): SharedReportOutputDto => {
	const { sentAt: _sentAt, analysis, highlights, ...rest } = toOutput(report);
	return {
		...rest,
		// The editor's notes and trace are the admin's too
		highlights: _.omit(highlights, ['notes', 'trace']),
		...(analysis && { analysis: _.omit(analysis, 'trace') }),
	};
};

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
		if (query.templateId) filters.template = query.templateId;
		if (query.configId) filters.config = query.configId;
		const [field, order] = (query.sort ?? 'updatedAt:desc').split(':') as [
			keyof Report,
			'asc' | 'desc',
		];
		const [items, totalItems] = await this.em.findAndCount(Report, filters, {
			populate: ['brand', 'city', 'config', 'template'],
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
				name: report.name,
				...links(report),
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
		return toOutput(await this.em.findOneOrFail(Report, { id }, { populate: ['brand', 'city', 'config', 'template'] }));
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

	/**
	 * A brand's report data as a rebuild would compute it now, without the LLM calls (no
	 * highlights, no reply drafts) and without saving anything: to check what a change to the
	 * data would move before rebuilding.
	 */
	@TypedRoute.Post('/preview')
	async previewReportData(@TypedBody() body: AdminBuildReportInputDto): Promise<ReportData> {
		return (await this.reportService.compute(body.brandId, body.cityId ?? null, body.month)).data;
	}

	/**
	 * Runs the analysis ("what moved, and why it might have") again on the report's stored data:
	 * the observations, their checks, the agent and the line check. Written on every report of
	 * that build (they share one data). The highlights are not rewritten: Rebuild does that.
	 * Takes up to a few minutes: an agent call with tools.
	 */
	@TypedRoute.Post('/:id/analyse')
	async analyseReport(@TypedParam('id') id: string & tags.Format<'uuid'>): Promise<AdminReportOutputDto> {
		const report = await this.reportService.analyseAgain(id);
		await this.em.populate(report, ['brand', 'city', 'config', 'template']);
		return toOutput(report);
	}

	/**
	 * Builds (or rebuilds) a brand's reports on its branches in a city, or (no `cityId`) in all
	 * its cities, for a month: one per active configuration (or the default), or only
	 * `configId`'s. Returns the first. Takes a few seconds: LLM calls.
	 */
	@TypedRoute.Post('/')
	async buildReport(@TypedBody() body: AdminBuildReportInputDto): Promise<AdminReportOutputDto> {
		const report = await this.reportService.build(body.brandId, body.cityId ?? null, body.month, {
			...(body.configId && { configId: body.configId }),
		});
		await this.em.populate(report, ['brand', 'city', 'config', 'template']);
		return toOutput(report);
	}
}
