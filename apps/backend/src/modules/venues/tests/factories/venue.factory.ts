import type { EntityManager } from '@mikro-orm/core';

import { Factory } from 'fishery';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { getEntityManager } from 'src/shared/util/em.js';

import type { Brand } from '../../entities/brand.entity.js';
import { Venue } from '../../entities/venue.entity.js';

export interface VenueTransientParams {
	em?: EntityManager;
}

export interface VenueAssociations {
	city: City;
	/** Without one, the venue gets a brand of its own, named like it */
	brand?: Brand;
}

let sequence = 0;

/** A restaurant of a city (association `city`, required), a branch of `brand` or a brand of its own. */
export const venueFactory = Factory.define<Venue, VenueTransientParams, Venue>(
	({ params, associations, transientParams, onCreate }) => {
		const em = transientParams.em ?? getEntityManager();
		onCreate(async venue => {
			await em.flush();
			return venue;
		});
		const { city, brand } = associations as Partial<VenueAssociations>;
		if (!city) throw new Error('venueFactory needs a city association');
		sequence++;
		return em.create(Venue, {
			placeId: `factory-place-${sequence}`,
			name: `Venue ${sequence}`,
			category: 'Restaurant',
			...params,
			city,
			...(brand && { brand }),
		} as Venue);
	},
);
