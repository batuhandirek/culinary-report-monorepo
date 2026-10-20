import type { EntityManager } from '@mikro-orm/core';

import { Factory } from 'fishery';

import { getEntityManager } from 'src/shared/util/em.js';

import { Brand } from '../../entities/brand.entity.js';
import { brandKey } from '../../util/brands.js';

export interface BrandTransientParams {
	em?: EntityManager;
}

/**
 * A brand; its key comes from the name unless given.
 * A venue made without a brand gets one of its own (`Venue.brand`'s `onCreate`).
 */
export const brandFactory = Factory.define<Brand, BrandTransientParams, Brand>(
	({ params, transientParams, onCreate }) => {
		const em = transientParams.em ?? getEntityManager();
		onCreate(async brand => {
			await em.flush();
			return brand;
		});
		const name = params.name ?? 'Burgermeister';
		return em.create(Brand, {
			...params,
			name,
			key: params.key ?? brandKey(name),
		} as unknown as Brand);
	},
);
