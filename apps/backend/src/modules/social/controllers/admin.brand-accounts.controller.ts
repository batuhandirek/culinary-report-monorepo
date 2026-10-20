import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';
import { previousMonth } from 'src/modules/venues/util/month.js';

import {
	AdminAddBrandAccountInputDto,
	AdminBrandAccountsInputDto,
	AdminUpdateBrandAccountInputDto,
} from '../dto/admin-account.input.dto.js';
import { AdminAccountOutputDto } from '../dto/admin-account.output.dto.js';
import { OwnAccountService } from '../services/own-account.service.js';
import { SocialAccountService } from '../services/social-account.service.js';
import { accountOutput } from '../util/account-output.js';

/**
 * A brand's own TikTok and Instagram accounts on its page: linked ones, the matcher's
 * suggestions for it, and the ones an admin said are not its (to undo).
 */
@Controller('/admin/brands/:id/accounts')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminBrandAccountsController {
	constructor(
		private readonly ownAccountService: OwnAccountService,
		private readonly socialAccountService: SocialAccountService,
	) {}

	@TypedRoute.Get('/')
	async listBrandAccounts(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedQuery() query: AdminBrandAccountsInputDto,
	): Promise<AdminAccountOutputDto[]> {
		return (await this.ownAccountService.forBrand(id, query.month ?? previousMonth())).map(accountOutput);
	}

	/** Adds a handle as the brand's own or one branch's: linked whoever had it, and no longer rejected. */
	@TypedRoute.Post('/')
	async addBrandAccount(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedBody() body: AdminAddBrandAccountInputDto,
	): Promise<AdminAccountOutputDto[]> {
		await this.ownAccountService.add(id, body.platform, body.handle, body.branchId);
		return this.listBrandAccounts(id, {});
	}

	/** Says whose an account is: one branch's (`branchId`) or the whole brand's (`null`). */
	@TypedRoute.Patch('/:accountId')
	async updateBrandAccount(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedParam('accountId') accountId: string & tags.Format<'uuid'>,
		@TypedBody() body: AdminUpdateBrandAccountInputDto,
	): Promise<AdminAccountOutputDto[]> {
		await this.ownAccountService.ensureOfBrand(id, accountId);
		await this.socialAccountService.decide(accountId, { action: 'branch', branchId: body.branchId });
		return this.listBrandAccounts(id, {});
	}

	/** "Not this brand's": final for the matcher; only an admin's add links it back. */
	@TypedRoute.Delete('/:accountId')
	async removeBrandAccount(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedParam('accountId') accountId: string & tags.Format<'uuid'>,
	): Promise<AdminAccountOutputDto[]> {
		await this.ownAccountService.ensureOfBrand(id, accountId);
		await this.socialAccountService.decide(accountId, { action: 'reject' });
		return this.listBrandAccounts(id, {});
	}
}
