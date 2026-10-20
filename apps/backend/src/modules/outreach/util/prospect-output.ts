import { wrap } from '@mikro-orm/core';

import _ from 'lodash';

import type { Brand } from 'src/modules/venues/entities/brand.entity.js';
import type { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { busiestBranch } from 'src/modules/venues/util/brands.js';

import type {
	AdminProspectBrandOutputDto,
	AdminProspectListItemOutputDto,
	AdminProspectVenueOutputDto,
	AdminSuggestedProspectOutputDto,
} from '../dto/admin-outreach.output.dto.js';
import type { Prospect } from '../entities/prospect.entity.js';

// How outreach shows a brand: its name and score, and the place it is reached at. The brand's
// branches must be populated (their cities for a suggestion).

/** A brand's most reviewed open branch: the place outreach reaches it at. */
export const placeOf = (brand: Brand): Venue | undefined =>
	busiestBranch(brand.branches.getItems().filter(v => !v.closed));

const openBranches = (brand: Brand) => brand.branches.getItems().filter(v => !v.closed).length;

export const prospectBrand = (brand: Brand): AdminProspectBrandOutputDto => ({
	id: brand.id,
	name: brand.name,
	...(brand.leadScore != null && { leadScore: brand.leadScore }),
	branches: openBranches(brand),
});

const prospectVenue = (venue: Venue): AdminProspectVenueOutputDto =>
	wrap(venue).serialize({ skipNull: true, forceObject: true }) as unknown as AdminProspectVenueOutputDto;

/** A prospect's own fields, its brand and its place. */
export const prospectItem = (prospect: Prospect): AdminProspectListItemOutputDto => {
	const place = placeOf(prospect.brand);
	return {
		...(wrap(prospect).serialize({ skipNull: true, forceObject: true, exclude: ['brand', 'touches'] }) as unknown as Omit<
			AdminProspectListItemOutputDto,
			'brand' | 'venue'
		>),
		brand: prospectBrand(prospect.brand),
		...(place && { venue: prospectVenue(place) }),
	};
};

/** A brand suggested for outreach, with its place's figures. */
export const suggestedProspect = (brand: Brand): AdminSuggestedProspectOutputDto => {
	const place = placeOf(brand);
	return {
		id: brand.id,
		name: brand.name,
		branches: openBranches(brand),
		leadScore: brand.leadScore ?? 0,
		...(brand.leadSignals && { leadSignals: brand.leadSignals }),
		...(place &&
			(_.omitBy(
				{
					category: place.category,
					district: place.district,
					website: place.website,
					rating: place.rating,
					reviewsCount: place.reviewsCount,
					city: place.city.name,
				},
				v => v == null,
			) as Partial<AdminSuggestedProspectOutputDto>)),
	};
};
