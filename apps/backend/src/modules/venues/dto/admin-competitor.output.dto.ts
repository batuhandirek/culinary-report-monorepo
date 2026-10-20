import type { AdminCityRefOutputDto } from 'src/modules/cities/dto/admin-city.output.dto.js';

import type { CompetitorPickedByEnum } from '../entities/brand-competitor.entity.js';

import type { AdminVenueListItemOutputDto } from './admin-venue.output.dto.js';

/** A place as the competition list shows it. */
export interface AdminCompetitorVenueOutputDto extends AdminVenueListItemOutputDto {
	city: AdminCityRefOutputDto;
}

/** A whole brand on the competition list. */
export interface AdminCompetitorBrandOutputDto {
	id: string;
	name: string;
	/** Its open branches */
	branches: number;
	/** The cities they are in */
	cities: AdminCityRefOutputDto[];
}

/** One entry on a brand's competition list: a place or a whole brand, and who put it there. */
export interface AdminCompetitorOutputDto {
	id: number;
	pickedBy: CompetitorPickedByEnum;
	/** The branch it competes with; absent for the whole brand */
	branch?: { id: string; name: string; street?: string };
	venue?: AdminCompetitorVenueOutputDto;
	rival?: AdminCompetitorBrandOutputDto;
}

/** A venue that could be added as a competitor (or its whole brand), and why it was picked. */
export interface AdminCompetitorSuggestionOutputDto {
	venue: AdminVenueListItemOutputDto;
	/** How many open branches its brand has: more than one offers adding the whole brand */
	brandBranches: number;
	score: number;
	/** "same category", "neighbouring district", … */
	reasons: string[];
}
