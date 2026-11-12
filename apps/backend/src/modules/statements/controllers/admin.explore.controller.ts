import { wrap } from '@mikro-orm/core';

import { Controller, UseGuards } from '@nestjs/common';

import { TypedQuery, TypedRoute } from '@nestia/core';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	AdminExploreBreakdownInputDto,
	AdminExploreBreakdownOutputDto,
	AdminExploreClaimsInputDto,
	AdminExploreGroupsInputDto,
	AdminExploreGroupsOutputDto,
	AdminExploreHeadOutputDto,
	AdminExploreInputDto,
	AdminExploreTermsInputDto,
	AdminExploreTermsOutputDto,
	AdminExploreTreeOutputDto,
} from '../dto/admin-explore.dto.js';
import type {
	AdminStatementRowOutputDto,
	AdminStatementsOutputDto,
} from '../dto/admin-statements.dto.js';
import { STATEMENT_SOURCE_POPULATE } from '../services/statement.service.js';
import {
	type InsightSelection,
	StatementInsightService,
} from '../services/statement-insight.service.js';
import { STATEMENT_PARTS_POPULATE } from '../util/statement-populate.js';

/** The URL's view as the service takes it: `with` split on commas */
const selectionOf = ({ with: further, ...rest }: AdminExploreInputDto): InsightSelection => ({
	...rest,
	with: further
		?.split(',')
		.map(ref => ref.trim())
		.filter(Boolean),
});

/**
 * The Explore page ("who talked about X"): any topic or wording, in any scope and months, with its
 * figures, a breakdown, its claims and their groups by meaning. Reads stored statements only.
 */
@Controller('/admin/explore')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminExploreController {
	constructor(private readonly statementInsightService: StatementInsightService) {}

	/** Every topic the view's claims are about, each with what is under it counted in */
	@TypedRoute.Get('/tree')
	async getExploreTree(
		@TypedQuery() query: AdminExploreInputDto,
	): Promise<AdminExploreTreeOutputDto> {
		return { nodes: await this.statementInsightService.tree(selectionOf(query)) };
	}

	/** The node's figures: sources, shares, sides, months, stated numbers */
	@TypedRoute.Get('/head')
	async getExploreHead(
		@TypedQuery() query: AdminExploreInputDto,
	): Promise<AdminExploreHeadOutputDto> {
		return this.statementInsightService.head(selectionOf(query));
	}

	/** The node broken down by one dimension */
	@TypedRoute.Get('/breakdown')
	async getExploreBreakdown(
		@TypedQuery() query: AdminExploreBreakdownInputDto,
	): Promise<AdminExploreBreakdownOutputDto> {
		const { by, ...rest } = query;
		return this.statementInsightService.breakdown(selectionOf(rest), by);
	}

	/** A page of the node's claims, newest first or closest to `like`, each with its source */
	@TypedRoute.Get('/claims')
	async listExploreClaims(
		@TypedQuery() query: AdminExploreClaimsInputDto,
	): Promise<AdminStatementsOutputDto> {
		const { page, size, q, like, sentiment, parts, ...rest } = query;
		const { total, items, notEmbedded } = await this.statementInsightService.claims(
			selectionOf(rest),
			{
				offset: (page - 1) * size,
				limit: size,
				q,
				like,
				sentiment,
				parts,
			},
		);
		return {
			totalItems: total,
			page,
			pageSize: size,
			notEmbedded,
			items: items.map(
				statement =>
					wrap(statement).serialize({
						skipNull: true,
						forceObject: true,
						populate: [...STATEMENT_PARTS_POPULATE, ...STATEMENT_SOURCE_POPULATE],
						exclude: [
							'review.venue.brand',
							'mention.brand.branches',
							'mention.venue.brand',
							'mention.post',
							'post.account.creator',
						],
					}) as unknown as AdminStatementRowOutputDto,
			),
		};
	}

	/** The node's claims grouped by meaning, once they have vectors */
	@TypedRoute.Get('/groups')
	async getExploreGroups(
		@TypedQuery() query: AdminExploreGroupsInputDto,
	): Promise<AdminExploreGroupsOutputDto> {
		const { similarity, minClaims, q, sentiment, parts, ...rest } = query;
		return this.statementInsightService.groups(
			selectionOf(rest),
			{ similarity, minClaims },
			{ q, sentiment, parts },
		);
	}

	/** Wordings to explore, by a part of their name */
	@TypedRoute.Get('/terms')
	async searchExploreTerms(
		@TypedQuery() query: AdminExploreTermsInputDto,
	): Promise<AdminExploreTermsOutputDto> {
		return { terms: await this.statementInsightService.terms(query.q) };
	}
}
