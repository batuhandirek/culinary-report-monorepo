import { QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Controller, NotFoundException, UseGuards } from '@nestjs/common';

import { TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';
import { Creator } from 'src/modules/social/entities/creator.entity.js';
import { SocialAccount } from 'src/modules/social/entities/social-account.entity.js';
import { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';
import { previousMonth } from 'src/modules/venues/util/month.js';

import { AdminCreatorWatchInputDto, AdminCreatorWatchOutputDto } from '../dto/admin-creator-watch.dto.js';
import { AccountWatchService } from '../services/account-watch.service.js';
import { PipelineService } from '../services/pipeline.service.js';

/**
 * Why a creator's profiles are scraped (the creator page's "Watched" panel). In the pipeline
 * module because the watch list depends on the month's report brands, which outreach's won
 * prospects decide and social cannot read.
 */
@Controller('/admin/creators')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminCreatorWatchController {
	constructor(
		private readonly em: EntityManager,
		private readonly pipelineService: PipelineService,
		private readonly accountWatchService: AccountWatchService,
	) {}

	@TypedRoute.Get('/:id/watch')
	async getCreatorWatch(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedQuery() query: AdminCreatorWatchInputDto,
	): Promise<AdminCreatorWatchOutputDto> {
		if (!(await this.em.count(Creator, { id }))) throw new NotFoundException();
		const month = query.month ?? previousMonth();
		const accounts = await this.em.find(
			SocialAccount,
			{ creator: id, platform: { $in: [SocialPlatformEnum.INSTAGRAM, SocialPlatformEnum.TIKTOK] } },
			{ orderBy: { platform: QueryOrder.ASC, handle: QueryOrder.ASC } },
		);
		const reasons = await this.accountWatchService.forAccounts(accounts, month, city =>
			this.pipelineService.topBrands(city, month),
		);
		return {
			month,
			accounts: accounts.map(a => ({
				accountId: a.id,
				platform: a.platform,
				handle: a.handle,
				reasons: reasons.get(a.id) ?? [],
			})),
		};
	}
}
