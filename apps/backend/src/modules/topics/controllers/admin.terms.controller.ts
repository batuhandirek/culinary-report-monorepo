import { Controller, UseGuards } from '@nestjs/common';

import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import {
	AdminChangeTermInputDto,
	AdminGetTermsInputDto,
	AdminTermsOutputDto,
	AdminUpdatedTermOutputDto,
} from '../dto/admin-terms.dto.js';
import { Term } from '../entities/term.entity.js';
import { TermService } from '../services/term.service.js';

const DEFAULT_LIMIT = 50;

@Controller('/admin/terms')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminTermsController {
	constructor(private readonly termService: TermService) {}

	/** The city's wordings with their topics and uses; `status` defaults to `unlinked`. */
	@TypedRoute.Get('/')
	async getTerms(@TypedQuery() query: AdminGetTermsInputDto): Promise<AdminTermsOutputDto> {
		return this.termService.list(query.cityId, {
			status: query.status,
			q: query.q,
			topicKey: query.topicKey,
			suggestion: query.suggestion,
			offset: query.offset ?? 0,
			limit: query.limit ?? DEFAULT_LIMIT,
		});
	}

	/** An admin's decision on a wording: its topics (empty for none), or back to the match and the agent. */
	@TypedRoute.Patch('/:id')
	async changeTerm(
		@TypedParam('id') id: number,
		@TypedBody() body: AdminChangeTermInputDto,
	): Promise<AdminUpdatedTermOutputDto> {
		return toDto(
			await this.termService.change(
				id,
				body.auto ?
					{ auto: true }
				:	{ topicKeys: body.topicKeys ?? [], relations: body.relations },
			),
		);
	}
}

const toDto = (term: Term): AdminUpdatedTermOutputDto => ({
	id: term.id,
	key: term.key,
	name: term.name,
	topics: term.topics
		.getItems()
		.filter(l => !l.topic.deletedAt)
		.map(l => ({
			key: l.topic.key,
			label: l.topic.label,
			kind: l.topic.kind,
			relation: l.relation,
		})),
	...(term.decidedBy && { decidedBy: term.decidedBy }),
	...(term.suggestion && { suggestion: term.suggestion }),
});
