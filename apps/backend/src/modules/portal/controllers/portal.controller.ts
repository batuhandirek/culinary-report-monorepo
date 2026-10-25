
import { BadRequestException, Controller, Get, Param, ParseUUIDPipe, Res, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import type { Response } from 'express';
import { tags } from 'typia';

import { AuthenticatedUserId } from 'src/modules/auth/decorators/authenticated-user-id.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { BrandAccessGuard } from 'src/modules/auth/guards/brand-access.guard.js';
import { BrandMemberService } from 'src/modules/auth/services/brand-member.service.js';
import { reportFileName, toOutput } from 'src/modules/reports/controllers/admin.reports.controller.js';
import { ReportPdfService } from 'src/modules/reports/services/report-pdf.service.js';

import {
	PortalAddCompetitorInputDto,
	PortalListCreatorsInputDto,
	PortalListPostsInputDto,
	PortalListReviewsInputDto,
	PortalMarkReviewRepliedInputDto,
	PortalPatternsInputDto,
	PortalSearchCompetitorsInputDto,
	PortalSeriesInputDto,
	PortalUpdateSettingsInputDto,
} from '../dto/portal.input.dto.js';
import {
	PortalCompetitorSearchOutputDto,
	PortalCompetitorsOutputDto,
	PortalCreatorsOutputDto,
	PortalPostFiltersOutputDto,
	PortalPostsOutputDto,
	PortalReviewFiltersOutputDto,
	PortalReviewOutputDto,
	PortalReviewsOutputDto,
	PortalBrandOutputDto,
	PortalBrandsOutputDto,
	PortalReportOutputDto,
	PortalReportsOutputDto,
	PortalSettingsOutputDto,
} from '../dto/portal.output.dto.js';
import { PortalPatternsOutputDto } from '../dto/portal-patterns.output.dto.js';
import { PortalSeriesOutputDto } from '../dto/portal-series.output.dto.js';
import { PortalService } from '../services/portal.service.js';

type Uuid = string & tags.Format<'uuid'>;

/**
 * The portal (`/portal` on the site): a brand's people read its reports there, every branch.
 * Every `/brands/:brandId/*` route lets in that brand's members and admins only
 * (`BrandAccessGuard`).
 */
@Controller('/portal')
@UseGuards(AuthenticationGuard)
export class PortalController {
	constructor(
		private readonly portalService: PortalService,
		private readonly brandMemberService: BrandMemberService,
		private readonly reportPdfService: ReportPdfService,
	) {}

	/** The brands the signed-in person is a member of. */
	@TypedRoute.Get('/brands')
	async listPortalBrands(@AuthenticatedUserId() userId: string): Promise<PortalBrandsOutputDto> {
		const members = await this.brandMemberService.membershipsOf(userId);
		const items: PortalBrandsOutputDto['items'] = [];
		for (const member of members)
			items.push({
				id: member.id,
				role: member.role,
				brand: await this.portalService.brand(member.brand.id),
			});
		return { items };
	}

	@TypedRoute.Get('/brands/:brandId')
	@UseGuards(BrandAccessGuard)
	async getPortalBrand(@TypedParam('brandId') brandId: Uuid): Promise<PortalBrandOutputDto> {
		return this.portalService.brand(brandId);
	}

	/** Every month with a report, newest first. */
	@TypedRoute.Get('/brands/:brandId/reports')
	@UseGuards(BrandAccessGuard)
	async listPortalReports(@TypedParam('brandId') brandId: Uuid): Promise<PortalReportsOutputDto> {
		const reports = await this.portalService.reports(brandId);
		return {
			items: reports.map(report => ({
				id: report.id,
				month: report.month,
				updatedAt: report.updatedAt,
				postCount: report.postCount,
				reviewCount: report.reviewCount,
				name: report.name,
				title: report.highlights.title,
				headline: report.highlights.headline,
				...(report.city && { city: { id: report.city.id, name: report.city.name } }),
			})),
		};
	}

	@TypedRoute.Get('/brands/:brandId/reports/:reportId')
	@UseGuards(BrandAccessGuard)
	async getPortalReport(
		@TypedParam('brandId') brandId: Uuid,
		@TypedParam('reportId') reportId: Uuid,
	): Promise<PortalReportOutputDto> {
		return toOutput(await this.portalService.report(brandId, reportId));
	}

	/** The report as an A4 PDF. Takes a few seconds: headless Chrome prints it. */
	@Get('/brands/:brandId/reports/:reportId/pdf')
	@UseGuards(BrandAccessGuard)
	async getPortalReportPdf(
		@Param('brandId', ParseUUIDPipe) brandId: string,
		@Param('reportId', ParseUUIDPipe) reportId: string,
		@Res() res: Response,
	): Promise<void> {
		const report = toOutput(await this.portalService.report(brandId, reportId));
		const pdf = await this.reportPdfService.render(report);
		const name = reportFileName(report);
		res.setHeader('Content-Type', 'application/pdf');
		res.setHeader(
			'Content-Disposition',
			`attachment; filename="report-${report.month}.pdf"; filename*=UTF-8''${encodeURIComponent(name)}.pdf`,
		);
		res.send(Buffer.from(pdf));
	}

	/** One row per month for the Trends tab, from the stored reports; months without one are null. */
	@TypedRoute.Get('/brands/:brandId/series')
	@UseGuards(BrandAccessGuard)
	async getPortalSeries(
		@TypedParam('brandId') brandId: Uuid,
		@TypedQuery() query: PortalSeriesInputDto,
	): Promise<PortalSeriesOutputDto> {
		return this.portalService.series(brandId, query.months ?? 12, query.cityId, undefined, query.branchId);
	}

	/** The relations each stored report holds, month by month, and the weeks across them. */
	@TypedRoute.Get('/brands/:brandId/patterns')
	@UseGuards(BrandAccessGuard)
	async getPortalPatterns(
		@TypedParam('brandId') brandId: Uuid,
		@TypedQuery() query: PortalPatternsInputDto,
	): Promise<PortalPatternsOutputDto> {
		return this.portalService.patterns(brandId, query.months ?? 6, query.cityId, undefined, query.branchId);
	}

	@TypedRoute.Get('/brands/:brandId/settings')
	@UseGuards(BrandAccessGuard)
	async getPortalSettings(@TypedParam('brandId') brandId: Uuid): Promise<PortalSettingsOutputDto> {
		return this.portalService.settings(brandId);
	}

	@TypedRoute.Patch('/brands/:brandId/settings')
	@UseGuards(BrandAccessGuard)
	async updatePortalSettings(
		@TypedParam('brandId') brandId: Uuid,
		@TypedBody() body: PortalUpdateSettingsInputDto,
	): Promise<PortalSettingsOutputDto> {
		return this.portalService.updateSettings(brandId, body);
	}
	/**
	 * The Google and TripAdvisor reviews of every branch, filtered, newest first, each with what it
	 * says (`feedback`); reply drafts under unanswered ones. The topic filter is any point of the topic.
	 */
	@TypedRoute.Get('/brands/:brandId/reviews')
	@UseGuards(BrandAccessGuard)
	async listPortalReviews(
		@TypedParam('brandId') brandId: Uuid,
		@TypedQuery() query: PortalListReviewsInputDto,
	): Promise<PortalReviewsOutputDto> {
		return this.portalService.reviews(brandId, query);
	}

	/** The months, languages and topics the reviews can be filtered by, and the to-do count. */
	@TypedRoute.Get('/brands/:brandId/review-filters')
	@UseGuards(BrandAccessGuard)
	async getPortalReviewFilters(
		@TypedParam('brandId') brandId: Uuid,
	): Promise<PortalReviewFiltersOutputDto> {
		return this.portalService.reviewFilters(brandId);
	}

	/** The owner says they answered a review on Google (or takes it back). */
	@TypedRoute.Put('/brands/:brandId/reviews/:reviewId/replied')
	@UseGuards(BrandAccessGuard)
	async markPortalReviewReplied(
		@TypedParam('brandId') brandId: Uuid,
		@TypedParam('reviewId') reviewId: Uuid,
		@TypedBody() body: PortalMarkReviewRepliedInputDto,
	): Promise<PortalReviewOutputDto> {
		return this.portalService.markReviewReplied(brandId, reviewId, body.replied);
	}

	/** Every post about the brand (any branch, or the brand alone), newest first, with what it says about the brand (`feedback`). */
	@TypedRoute.Get('/brands/:brandId/posts')
	@UseGuards(BrandAccessGuard)
	async listPortalPosts(
		@TypedParam('brandId') brandId: Uuid,
		@TypedQuery() query: PortalListPostsInputDto,
	): Promise<PortalPostsOutputDto> {
		return this.portalService.posts(brandId, query);
	}

	/** The posts grouped by author, most viewed first. */
	@TypedRoute.Get('/brands/:brandId/creators')
	@UseGuards(BrandAccessGuard)
	async listPortalCreators(
		@TypedParam('brandId') brandId: Uuid,
		@TypedQuery() query: PortalListCreatorsInputDto,
	): Promise<PortalCreatorsOutputDto> {
		return this.portalService.creators(brandId, query);
	}

	@TypedRoute.Get('/brands/:brandId/post-filters')
	@UseGuards(BrandAccessGuard)
	async getPortalPostFilters(
		@TypedParam('brandId') brandId: Uuid,
	): Promise<PortalPostFiltersOutputDto> {
		return this.portalService.postFilters(brandId);
	}

	/** The places and brands the reports compare it with, and suggestions while there is room. */
	@TypedRoute.Get('/brands/:brandId/competitors')
	@UseGuards(BrandAccessGuard)
	async listPortalCompetitors(
		@TypedParam('brandId') brandId: Uuid,
	): Promise<PortalCompetitorsOutputDto> {
		return this.portalService.competitors(brandId);
	}

	/** Places in the brand's cities the owner can pick, by name, street or district. */
	@TypedRoute.Get('/brands/:brandId/competitor-search')
	@UseGuards(BrandAccessGuard)
	async searchPortalCompetitors(
		@TypedParam('brandId') brandId: Uuid,
		@TypedQuery() query: PortalSearchCompetitorsInputDto,
	): Promise<PortalCompetitorSearchOutputDto> {
		return { items: await this.portalService.searchCompetitors(brandId, query.q) };
	}

	/** Adds a competitor; a sixth is refused (`TOO_MANY_COMPETITORS`). */
	@TypedRoute.Post('/brands/:brandId/competitors')
	@UseGuards(BrandAccessGuard)
	async addPortalCompetitor(
		@TypedParam('brandId') brandId: Uuid,
		@TypedBody() body: PortalAddCompetitorInputDto,
	): Promise<PortalCompetitorsOutputDto> {
		if (!body.venueId === !body.brandId) throw new BadRequestException('Give a place or a brand');
		return this.portalService.addCompetitor(
			brandId,
			body.venueId ? { venueId: body.venueId } : { brandId: body.brandId! },
			body.branchId,
		);
	}

	@TypedRoute.Delete('/brands/:brandId/competitors/:competitorId')
	@UseGuards(BrandAccessGuard)
	async removePortalCompetitor(
		@TypedParam('brandId') brandId: Uuid,
		@TypedParam('competitorId') competitorId: number & tags.Type<'uint32'>,
	): Promise<PortalCompetitorsOutputDto> {
		return this.portalService.removeCompetitor(brandId, competitorId);
	}
}
