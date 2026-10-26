import { Controller, Get, NotFoundException, Param, Res, UseGuards } from '@nestjs/common';

import { TypedParam, TypedRoute } from '@nestia/core';
import type { Response } from 'express';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { OptionalAuthenticatedUserRoles } from 'src/modules/auth/decorators/optional-authenticated-user-roles.decorator.js';
import { OptionalAuthenticationGuard } from 'src/modules/auth/guards/optional-authentication.guard.js';

import { SharedReportOutputDto } from '../dto/report-share.output.dto.js';
import { ReportPdfService } from '../services/report-pdf.service.js';
import { ReportShareService } from '../services/report-share.service.js';

import { reportFileName, toPublicOutput } from './admin.reports.controller.js';

type ShareToken = string & tags.Pattern<'^[A-Za-z0-9_-]{22,64}$'>;
const TOKEN = /^[A-Za-z0-9_-]{22,64}$/;

// Printed PDFs kept per report version, so repeated downloads don't each start Chrome
const PDF_CACHE_SIZE = 8;

/**
 * A report opened through a private link (`/r/<token>`), with no login: the token is the only
 * key. Public on purpose; an unknown or revoked token answers 404.
 */
@Controller('/reports/shared')
export class SharedReportsController {
	// Keyed by report id and its last build, so a rebuild prints afresh
	private readonly pdfs = new Map<string, Promise<Uint8Array>>();

	constructor(
		private readonly reportShareService: ReportShareService,
		private readonly reportPdfService: ReportPdfService,
	) {}

	/** The report. Reading it does not count as an open: link previews and the page's server render read it too. */
	@TypedRoute.Get('/:token')
	async getSharedReport(@TypedParam('token') token: ShareToken): Promise<SharedReportOutputDto> {
		return toPublicOutput(await this.reportShareService.findReport(token));
	}

	/** Counts an open. The page calls it from the browser, so bots and admins checking the link don't count. */
	@TypedRoute.Post('/:token/opens')
	@UseGuards(OptionalAuthenticationGuard)
	async recordSharedReportOpen(
		@TypedParam('token') token: ShareToken,
		@OptionalAuthenticatedUserRoles() roles: UserRoleEnum[] | undefined,
	): Promise<void> {
		if (roles?.includes(UserRoleEnum.ADMIN)) {
			await this.reportShareService.findReport(token);
			return;
		}
		await this.reportShareService.recordOpen(token);
	}

	/** The report as an A4 PDF. */
	@Get('/:token/pdf')
	async getSharedReportPdf(@Param('token') token: string, @Res() res: Response): Promise<void> {
		if (!TOKEN.test(token)) throw new NotFoundException();
		const report = toPublicOutput(await this.reportShareService.findReport(token));
		const pdf = await this.printOnce(report);
		const name = reportFileName(report);
		res.setHeader('Content-Type', 'application/pdf');
		res.setHeader(
			'Content-Disposition',
			`attachment; filename="report-${report.month}.pdf"; filename*=UTF-8''${encodeURIComponent(name)}.pdf`,
		);
		res.setHeader('X-Robots-Tag', 'noindex, nofollow');
		res.send(Buffer.from(pdf));
	}

	private printOnce(report: SharedReportOutputDto): Promise<Uint8Array> {
		const key = `${report.id}:${new Date(report.updatedAt).getTime()}`;
		let pdf = this.pdfs.get(key);
		if (!pdf) {
			pdf = this.reportPdfService.render(report);
			pdf.catch(() => this.pdfs.delete(key));
			this.pdfs.set(key, pdf);
			// Oldest out first: a Map iterates in insertion order
			while (this.pdfs.size > PDF_CACHE_SIZE)
				this.pdfs.delete(this.pdfs.keys().next().value!);
		}
		return pdf;
	}
}
