import { wrap } from '@mikro-orm/core';

import { Controller, UseGuards } from '@nestjs/common';

import { TypedParam, TypedRoute } from '@nestia/core';
import { tags } from 'typia';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { Roles } from 'src/modules/auth/decorators/roles.decorator.js';
import { AuthenticationGuard } from 'src/modules/auth/guards/authentication.guard.js';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard.js';

import { AdminVenueSearchRankOutputDto } from '../dto/admin-venue-search-rank.output.dto.js';
import { VenueSearchRankService } from '../services/venue-search-rank.service.js';

@Controller('/admin/venues')
@UseGuards(AuthenticationGuard, RolesGuard)
@Roles(UserRoleEnum.ADMIN)
export class AdminVenueSearchRanksController {
	constructor(private readonly venueSearchRankService: VenueSearchRankService) {}

	/** The venue's Google Maps search ranks (`TRACK_SEARCH_RANKS`), newest month first. */
	@TypedRoute.Get('/:id/search-ranks')
	async listVenueSearchRanks(
		@TypedParam('id') id: string & tags.Format<'uuid'>,
	): Promise<AdminVenueSearchRankOutputDto[]> {
		return (await this.venueSearchRankService.forVenue(id)).map(
			rank =>
				wrap(rank).serialize({
					skipNull: true,
					forceObject: true,
					exclude: ['venue', 'createdAt', 'updatedAt', 'deletedAt'],
				}) as unknown as AdminVenueSearchRankOutputDto,
		);
	}
}
