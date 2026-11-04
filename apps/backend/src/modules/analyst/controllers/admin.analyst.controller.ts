import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import type { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { AuthenticatedUserId } from 'src/modules/auth/decorators/authenticated-user-id.decorator.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';
import type { OkResponse } from 'src/shared/interfaces/ok-response.interface.js';

import type {
	AdminAnalystAskInputDto,
	AdminAnalystAskOutputDto,
	AdminAnalystMentionsInputDto,
	AdminAnalystMentionsOutputDto,
	AdminAnalystRenameInputDto,
	AdminAnalystThreadDetailOutputDto,
	AdminAnalystThreadOutputDto,
	AdminAnalystThreadsInputDto,
	AdminAnalystThreadsOutputDto,
} from '../dto/admin-analyst.dto.js';
import { AnalystSqlService } from '../services/analyst-sql.service.js';
import { AnalystThreadService } from '../services/analyst-thread.service.js';
import { mentionToken } from '../util/mentions.js';

/**
 * The analyst (`/admin/ask`): free questions about the data, answered by an agent that plans and
 * queries Postgres read-only. A question returns at once with its answer queued; the answer is
 * written live over the `analyst` socket (`AnalystGateway`) and stored part by part.
 */
@Controller('/admin/analyst')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminAnalystController {
	constructor(
		private readonly threadService: AnalystThreadService,
		private readonly sqlService: AnalystSqlService,
	) {}

	/** Every admin's threads, the latest active first */
	@TypedRoute.Get('/threads')
	async listAnalystThreads(
		@TypedQuery() query: AdminAnalystThreadsInputDto,
	): Promise<AdminAnalystThreadsOutputDto> {
		return this.threadService.list(query.page, query.size, query.q);
	}

	/** A thread with every message and part, oldest first */
	@TypedRoute.Get('/threads/:id')
	async getAnalystThread(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
	): Promise<AdminAnalystThreadDetailOutputDto> {
		return this.threadService.get(id);
	}

	/** A question: a new thread, or a follow-up (409 while the last answer is being written) */
	@TypedRoute.Post('/questions')
	async askAnalyst(
		@AuthenticatedUserId() userId: string,
		@TypedBody() body: AdminAnalystAskInputDto,
	): Promise<AdminAnalystAskOutputDto> {
		return this.threadService.ask(userId, body.text, body.threadId);
	}

	@TypedRoute.Patch('/threads/:id')
	async renameAnalystThread(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
		@TypedBody() body: AdminAnalystRenameInputDto,
	): Promise<AdminAnalystThreadOutputDto> {
		return this.threadService.rename(id, body.title);
	}

	@TypedRoute.Delete('/threads/:id')
	async deleteAnalystThread(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
	): Promise<OkResponse> {
		await this.threadService.remove(id);
		return { ok: true };
	}

	/** Rows by name for the composer's `@` picker, each with the token it inserts */
	@TypedRoute.Get('/mentions')
	async searchAnalystMentions(
		@TypedQuery() query: AdminAnalystMentionsInputDto,
	): Promise<AdminAnalystMentionsOutputDto> {
		const found = await this.sqlService.search(query.type, query.q, query.cityId);
		return { items: found.map(f => ({ ...f, token: mentionToken(f.type, f.ref) })) };
	}
}
