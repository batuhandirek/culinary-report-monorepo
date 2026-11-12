import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	AdminChangeTermInputDto,
	AdminGetTermsInputDto,
	AdminPromoteTermInputDto,
	AdminTermsOutputDto,
	AdminUpdatedTermOutputDto,
} from '../dto/admin-terms.dto.js';
import { termRow, TermService } from '../services/term.service.js';

const DEFAULT_LIMIT = 50;

@Controller('/admin/terms')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminTermsController {
	constructor(private readonly termService: TermService) {}

	/** The city's wordings with their topics and uses; `status` defaults to `all`. */
	@TypedRoute.Get('/')
	async getTerms(@TypedQuery() query: AdminGetTermsInputDto): Promise<AdminTermsOutputDto> {
		return this.termService.list(query.cityId, {
			status: query.status,
			q: query.q,
			topicKey: query.topicKey,
			offset: query.offset ?? 0,
			limit: query.limit ?? DEFAULT_LIMIT,
		});
	}

	/** An admin's decision on a wording: its main topic (null for none), exact or narrower with modifiers, or back to the match and the agent. */
	@TypedRoute.Patch('/:id')
	async changeTerm(
		@TypedParam('id') id: number,
		@TypedBody() body: AdminChangeTermInputDto,
	): Promise<AdminUpdatedTermOutputDto> {
		return termRow(
			await this.termService.change(
				id,
				body.auto ?
					{ auto: true }
				:	{ topicKey: body.topicKey ?? null, exact: body.exact, modifiers: body.modifiers },
			),
		);
	}

	/** "Make it a topic of its own": the wording's group becomes a topic now, whatever its uses, and the wording is it. */
	@TypedRoute.Post('/:id/promotion')
	async promoteTerm(
		@TypedParam('id') id: number,
		@TypedBody() body: AdminPromoteTermInputDto,
	): Promise<AdminUpdatedTermOutputDto> {
		return termRow(await this.termService.promoteTerm(id, body));
	}
}
