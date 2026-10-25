import { FilterQuery, QueryOrder, wrap } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { BadRequestException, Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import _ from 'lodash';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { AuthenticatedUserId } from 'src/modules/auth/decorators/authenticated-user-id.decorator.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';
import { BrandMemberService } from 'src/modules/auth/services/brand-member.service.js';
import { toOutput } from 'src/modules/reports/controllers/admin.reports.controller.js';
import { AdminReportOutputDto } from 'src/modules/reports/dto/admin-report.output.dto.js';
import { Report } from 'src/modules/reports/entities/report.entity.js';
import { ReportService } from 'src/modules/reports/services/report.service.js';

import {
	AdminAddProspectInputDto,
	AdminInviteToPortalInputDto,
	AdminListProspectsInputDto,
	AdminListSuggestedProspectsInputDto,
	AdminLogOutreachTouchInputDto,
	AdminUpdateProspectInputDto,
} from '../dto/admin-outreach.input.dto.js';
import {
	AdminListProspectsOutputDto,
	AdminOutreachSummaryOutputDto,
	AdminPortalMemberOutputDto,
	AdminProspectOutputDto,
	AdminProspectReportOutputDto,
	AdminSuggestedProspectOutputDto,
} from '../dto/admin-outreach.output.dto.js';
import { Prospect } from '../entities/prospect.entity.js';
import { placeOf, prospectItem, suggestedProspect } from '../util/prospect-output.js';
import { dueBefore, OutreachService } from '../services/outreach.service.js';
import { ProspectQueryService } from '../services/prospect-query.service.js';
import { ReportDeliveryService } from '../services/report-delivery.service.js';

const date = (value: string | null | undefined) =>
	value === undefined ? undefined : value === null ? null : new Date(value);

/** What an outreach email quotes from a report. */
const reportSummary = (report: Report): AdminProspectReportOutputDto => ({
	id: report.id,
	month: report.month,
	title: report.highlights.title,
	headline: report.highlights.headline,
	posts: report.data.social.postCount,
	creators: report.data.social.creators,
	views: report.data.social.views,
	reviews: report.data.reviews.count,
	avgStars: report.data.reviews.avgStars,
	replyRate: report.data.reviews.replyRate,
	ownAccounts: _.uniqBy(
		report.data.ownPosts.flatMap(post =>
			// A brand's own accounts are profiles, never a blog
			post.author && post.platform !== 'blog' ? [{ platform: post.platform, handle: post.author }] : [],
		),
		account => `${account.platform}:${account.handle}`,
	),
});

@Controller('/admin/outreach')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminOutreachController {
	constructor(
		private readonly em: EntityManager,
		private readonly outreachService: OutreachService,
		private readonly reportService: ReportService,
		private readonly prospectQueryService: ProspectQueryService,
		private readonly reportDeliveryService: ReportDeliveryService,
		private readonly brandMemberService: BrandMemberService,
	) {}

	@TypedRoute.Get('/summary')
	async getOutreachSummary(): Promise<AdminOutreachSummaryOutputDto> {
		return this.outreachService.summary();
	}

	@TypedRoute.Get('/prospects')
	async listProspects(
		@TypedQuery() query: AdminListProspectsInputDto,
	): Promise<AdminListProspectsOutputDto> {
		const filters: FilterQuery<Prospect> = {};
		if (query.brandId || query.q || query.cityId)
			filters.brand = {
				...(query.brandId && { id: query.brandId }),
				...(query.q && { name: { $ilike: `%${query.q}%` } }),
				...(query.cityId && { branches: { city: query.cityId } }),
			};
		if (query.stage) filters.stage = query.stage;
		if (query.due) filters.nextFollowUpAt = { $lt: dueBefore(new Date()) };

		const [field, order] = (query.sort ?? 'nextFollowUpAt:asc').split(':') as [
			string,
			'asc' | 'desc',
		];
		const direction = order === 'asc' ? QueryOrder.ASC_NULLS_LAST : QueryOrder.DESC_NULLS_LAST;
		const [items, totalItems] = await this.em.findAndCount(Prospect, filters, {
			populate: ['brand', 'brand.branches'],
			// The order they were added in breaks ties, so a list added best-first stays so
			orderBy: [
				field === 'name' ? { brand: { name: direction } }
				: field === 'leadScore' ? { brand: { leadScore: direction } }
				: { [field]: direction },
				{ createdAt: QueryOrder.ASC },
			],
			offset: (query.page - 1) * query.size,
			limit: query.size,
		});
		return {
			items: items.map(prospectItem),
			totalItems,
			page: query.page,
			pageSize: query.size,
		};
	}

	/** The best-scoring brands not on the list yet, with the signals behind each score (`OutreachService.add` takes one on). */
	@TypedRoute.Get('/suggested')
	async listSuggestedProspects(
		@TypedQuery() query: AdminListSuggestedProspectsInputDto,
	): Promise<AdminSuggestedProspectOutputDto[]> {
		const brands = await this.prospectQueryService.suggested(query.size ?? 20);
		return brands.map(suggestedProspect);
	}

	/** Adds a brand to the pipeline; one already on it is returned as it is. */
	@TypedRoute.Post('/prospects')
	async addProspect(@TypedBody() body: AdminAddProspectInputDto): Promise<AdminProspectOutputDto> {
		const { brandId, ...details } = body;
		const prospect = await this.outreachService.add(brandId, details);
		return this.getProspect(prospect.id);
	}

	@TypedRoute.Get('/prospects/:id')
	async getProspect(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
	): Promise<AdminProspectOutputDto> {
		// A fresh read: the touch a mutation just added must be in the list
		this.em.clear();
		const prospect = await this.em.findOneOrFail(
			Prospect,
			{ id },
			{
				populate: ['brand.branches.city', 'touches', 'touches.report', 'touches.share'],
				populateOrderBy: { touches: { at: QueryOrder.DESC, createdAt: QueryOrder.DESC } },
			},
		);
		const report = await this.reportService.latest(prospect.brand.id);
		const members = await this.brandMemberService.listForBrand(prospect.brand.id);
		const place = placeOf(prospect.brand);
		return {
			...prospectItem(prospect),
			touches: prospect.touches.getItems().map(
				touch =>
					wrap(touch).serialize({
						skipNull: true,
						forceObject: true,
						populate: ['report', 'share'],
						exclude: ['report.data', 'report.highlights', 'share.token', 'share.report', 'share.createdBy'],
					}) as unknown as AdminProspectOutputDto['touches'][number],
			),
			...(place && { city: place.city.name }),
			latestReport: report ? reportSummary(report) : undefined,
			portalMembers: members.map(
				member =>
					wrap(member).serialize({
						skipNull: true,
						forceObject: true,
						populate: ['user'],
					}) as unknown as AdminPortalMemberOutputDto,
			),
		};
	}

	@TypedRoute.Patch('/prospects/:id')
	async updateProspect(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedBody() body: AdminUpdateProspectInputDto,
	): Promise<AdminProspectOutputDto> {
		const { nextFollowUpAt, emailConsentAt, ...patch } = body;
		await this.outreachService.update(id, {
			...patch,
			nextFollowUpAt: date(nextFollowUpAt),
			emailConsentAt: date(emailConsentAt),
		});
		return this.getProspect(id);
	}

	/** Takes a brand off the pipeline with its log. Refused for one who opted out. */
	@TypedRoute.Delete('/prospects/:id')
	async removeProspect(@TypedParam('id') id: string & tags.Format<'uuid'>): Promise<void> {
		await this.outreachService.remove(id);
	}

	/** Writes the hook anew from the brand's report and lead signals (one LLM call), over the old one. */
	@TypedRoute.Post('/prospects/:id/hook')
	async writeProspectHook(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
	): Promise<AdminProspectOutputDto> {
		await this.outreachService.writeHook(id);
		return this.getProspect(id);
	}

	/** Logs an email, DM, call, visit (with its outcome, come-back time and consent), reply or note, and moves the prospect along. */
	@TypedRoute.Post('/prospects/:id/touches')
	async logOutreachTouch(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedBody() body: AdminLogOutreachTouchInputDto,
	): Promise<AdminProspectOutputDto> {
		const { at, followUpAt, comeBackAt, ...touch } = body;
		await this.outreachService.log(id, {
			...touch,
			at: date(at) ?? undefined,
			followUpAt: date(followUpAt),
			comeBackAt: date(comeBackAt) ?? undefined,
		});
		return this.getProspect(id);
	}

	/**
	 * Invites someone (the contact e-mail unless another is given) to the brand's portal and
	 * mails them the link, in the prospect's language. Inviting again sends the mail again.
	 */
	@TypedRoute.Post('/prospects/:id/portal-members')
	async inviteToPortal(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedBody() body: AdminInviteToPortalInputDto,
		@AuthenticatedUserId() adminId: string,
	): Promise<AdminProspectOutputDto> {
		const prospect = await this.em.findOneOrFail(Prospect, { id });
		const email = body.email ?? prospect.contactEmail;
		if (!email) throw new BadRequestException('The prospect has no contact e-mail');
		const isContact = email.toLowerCase().trim() === prospect.contactEmail?.toLowerCase().trim();
		await this.brandMemberService.invite({
			brandId: prospect.brand.id,
			email,
			name: isContact ? prospect.contactName : undefined,
			role: body.role,
			invitedById: adminId,
			language: prospect.language,
		});
		return this.getProspect(id);
	}

	/** Takes someone off the brand's portal; they lose access at once. */
	@TypedRoute.Delete('/prospects/:id/portal-members/:memberId')
	async removePortalMember(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedParam('memberId') memberId: string & tags.Format<'uuid'>,
	): Promise<AdminProspectOutputDto> {
		const prospect = await this.em.findOneOrFail(Prospect, { id });
		await this.brandMemberService.remove(prospect.brand.id, memberId);
		return this.getProspect(id);
	}

	/** Deletes a log entry made by mistake. The stage stays as it is. */
	@TypedRoute.Delete('/prospects/:id/touches/:touchId')
	async removeOutreachTouch(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedParam('touchId') touchId: string & tags.Format<'uuid'>,
	): Promise<AdminProspectOutputDto> {
		await this.outreachService.removeTouch(id, touchId);
		return this.getProspect(id);
	}

	/**
	 * E-mails a report to its brand now, again if it went out before. Only a won prospect with
	 * an address gets one. Logged on its outreach record.
	 */
	@TypedRoute.Post('/reports/:reportId/send')
	async sendReport(
		@TypedParam('reportId') reportId: string & tags.Format<'uuid'>,
	): Promise<AdminReportOutputDto> {
		const report = await this.reportDeliveryService.sendNow(reportId);
		return toOutput(report);
	}
}
