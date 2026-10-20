import { wrap } from '@mikro-orm/core';

import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';
import { previousMonth } from 'src/modules/venues/util/month.js';

import {
	AdminCreatorAccountRefOutputDto,
	AdminCreatorDetailInputDto,
	AdminCreatorOutputDto,
	AdminListCreatorsInputDto,
	AdminListCreatorsOutputDto,
	AdminMergeCreatorAccountsInputDto,
	AdminUpdateCreatorInputDto,
} from '../dto/admin-creator.dto.js';
import { CreatorService } from '../services/creator.service.js';
import { SocialAccountService } from '../services/social-account.service.js';
import { accountOutput } from '../util/account-output.js';

/** Creators (`/admin/creators`): who posts about the city's food, over all their accounts. */
@Controller('/admin/creators')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminCreatorsController {
	constructor(
		private readonly creatorService: CreatorService,
		private readonly socialAccountService: SocialAccountService,
	) {}

	@TypedRoute.Get('/')
	async listCreators(@TypedQuery() query: AdminListCreatorsInputDto): Promise<AdminListCreatorsOutputDto> {
		const { items, totalItems } = await this.creatorService.list({ ...query, month: query.month ?? previousMonth() });
		return {
			items: items.map(row => ({
				id: row.creator.id,
				name: row.creator.name,
				accounts: row.creator.accounts.getItems().map(
					a =>
						wrap(a).serialize({
							skipNull: true,
							forceObject: true,
							populate: ['brand'],
							exclude: ['brand.branches'],
						}) as unknown as AdminCreatorAccountRefOutputDto,
				),
				own: row.own,
				...(row.followers !== undefined && { followers: row.followers }),
				month: row.month,
			})),
			totalItems,
			page: query.page,
			pageSize: query.size,
		};
	}

	@TypedRoute.Get('/:id')
	async getCreator(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedQuery() query: AdminCreatorDetailInputDto,
	): Promise<AdminCreatorOutputDto> {
		const detail = await this.creatorService.detail(id, query.month ?? previousMonth());
		return {
			id: detail.creator.id,
			name: detail.creator.name,
			createdAt: detail.creator.createdAt,
			accounts: detail.accounts.map(accountOutput),
			months: detail.months,
			brands: detail.brands,
			posts: detail.posts,
			views: detail.views,
		};
	}

	@TypedRoute.Patch('/:id')
	async updateCreator(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedBody() body: AdminUpdateCreatorInputDto,
	): Promise<AdminCreatorOutputDto> {
		await this.socialAccountService.rename(id, body.name);
		return this.getCreator(id, {});
	}

	/** "These are one person": the accounts move under this creator. */
	@TypedRoute.Post('/:id/accounts')
	async mergeCreatorAccounts(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedBody() body: AdminMergeCreatorAccountsInputDto,
	): Promise<AdminCreatorOutputDto> {
		await this.socialAccountService.merge(id, body.accountIds);
		return this.getCreator(id, {});
	}
}
