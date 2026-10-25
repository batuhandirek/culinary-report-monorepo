import { Controller, UseGuards } from '@nestjs/common';

import { TypedQuery, TypedRoute } from '@nestia/core';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import { AdminNewsletterCountsInputDto } from '../dto/newsletter.input.dto.js';
import { AdminNewsletterCountsOutputDto } from '../dto/newsletter.output.dto.js';
import { NewsletterService } from '../services/newsletter.service.js';

@Controller('/admin/newsletter')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminNewsletterController {
	constructor(private readonly newsletterService: NewsletterService) {}

	/** A city's newsletter addresses by state: confirmed, waiting for the link, unsubscribed. */
	@TypedRoute.Get('/counts')
	async getNewsletterCounts(
		@TypedQuery() query: AdminNewsletterCountsInputDto,
	): Promise<AdminNewsletterCountsOutputDto> {
		return this.newsletterService.counts(query.cityId);
	}
}
