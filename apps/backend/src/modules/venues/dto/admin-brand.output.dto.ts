import type { AdminCityRefOutputDto } from 'src/modules/cities/dto/admin-city.output.dto.js';

import type { BrandReportScopeEnum } from '../entities/brand.entity.js';
import type { LeadSignals } from '../interfaces/lead-score.interface.js';
import type { BrandSuggestionGroup } from '../util/brands.js';

import type { AdminVenueListItemOutputDto } from './admin-venue.output.dto.js';

/** A brand as other pages name it. */
export interface AdminBrandRefOutputDto {
	id: string;
	name: string;
	/** One report per city, or one across all its cities */
	reportScope: BrandReportScopeEnum;
	leadScore?: number;
}

/** A branch (or a possible one): the venue, its city and the mentions linked to it. */
export interface AdminBrandBranchOutputDto extends Omit<
	AdminVenueListItemOutputDto,
	'mentionCount' | 'brand'
> {
	city: AdminCityRefOutputDto;
	/** Mentions linked to it (its branch known), of any month */
	mentions: number;
}

export interface AdminBrandListItemOutputDto {
	id: string;
	name: string;
	key: string;
	reportScope: BrandReportScopeEnum;
	leadScore?: number;
	createdAt: Date;
	branches: AdminBrandBranchOutputDto[];
	/** Mentions that name the brand but no branch, of any month */
	brandOnlyMentions: number;
}

export interface AdminBrandOutputDto extends AdminBrandListItemOutputDto {
	/** When its name was last searched on Google Maps, per city id */
	branchesSearchedAt: Record<string, string>;
	/** How we scored it as an outreach prospect (`BrandLeadScoreService`) */
	leadSignals?: LeadSignals;
	/** Places with a branch name that are a brand of their own, in any city */
	candidates: AdminBrandBranchOutputDto[];
}

export interface AdminBrandSuggestionOutputDto {
	key: string;
	name: string;
	reason: BrandSuggestionGroup['reason'];
	venues: AdminBrandBranchOutputDto[];
}
