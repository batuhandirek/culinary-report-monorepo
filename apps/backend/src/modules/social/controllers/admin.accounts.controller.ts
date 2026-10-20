import { EntityManager } from '@mikro-orm/postgresql';

import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { previousMonth } from 'src/modules/venues/util/month.js';

import {
	AdminDecideAccountInputDto,
	AdminListAccountsInputDto,
	AdminMatchAccountsInputDto,
} from '../dto/admin-account.input.dto.js';
import {
	AdminAccountOutputDto,
	AdminListAccountsOutputDto,
	AdminMatchAccountsOutputDto,
} from '../dto/admin-account.output.dto.js';
import type { AdminSplitAccountOutputDto } from '../dto/admin-creator.dto.js';
import { SocialAccount } from '../entities/social-account.entity.js';
import { AccountMatchingService } from '../services/account-matching.service.js';
import { SocialAccountService } from '../services/social-account.service.js';
import { ACCOUNT_POPULATE, accountOutput } from '../util/account-output.js';

/**
 * TikTok and Instagram accounts (`/admin/accounts`): venues' own accounts with their figures,
 * the matcher's suggestions to confirm or reject, and running the matcher for a city.
 */
@Controller('/admin/accounts')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminAccountsController {
	constructor(
		private readonly em: EntityManager,
		private readonly socialAccountService: SocialAccountService,
		private readonly accountMatchingService: AccountMatchingService,
		private readonly cityService: CityService,
	) {}

	@TypedRoute.Get('/')
	async listAccounts(@TypedQuery() query: AdminListAccountsInputDto): Promise<AdminListAccountsOutputDto> {
		const { items, totalItems, counts } = await this.socialAccountService.list({
			...query,
			month: query.month ?? previousMonth(),
		});
		return { items: items.map(accountOutput), totalItems, counts, page: query.page, pageSize: query.size };
	}

	/** Links, confirms, rejects or re-branches one account. */
	@TypedRoute.Patch('/:id')
	async decideAccount(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedBody() body: AdminDecideAccountInputDto,
	): Promise<AdminAccountOutputDto> {
		await this.socialAccountService.decide(id, body);
		return this.output(id);
	}

	/** Runs the matcher for a city now (it runs after every mention matching anyway). */
	@TypedRoute.Post('/match')
	async matchAccounts(@TypedBody() body: AdminMatchAccountsInputDto): Promise<AdminMatchAccountsOutputDto> {
		return this.accountMatchingService.match(await this.cityService.getById(body.cityId));
	}

	/** Takes an account out of its creator: "not the same person". */
	@TypedRoute.Post('/:id/split')
	async splitAccount(@TypedParam('id') id: string & tags.Format<'uuid'>): Promise<AdminSplitAccountOutputDto> {
		const creator = await this.socialAccountService.split(id);
		return { creatorId: creator.id };
	}

	private async output(id: string): Promise<AdminAccountOutputDto> {
		const account = await this.em.findOneOrFail(SocialAccount, { id }, { populate: [...ACCOUNT_POPULATE], refresh: true });
		const [row] = await this.socialAccountService.withFigures([account], previousMonth());
		return accountOutput(row);
	}
}
