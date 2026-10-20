import type { EntityManager } from '@mikro-orm/core';

import { Factory } from 'fishery';

import { getEntityManager } from 'src/shared/util/em.js';

import { City } from '../../entities/city.entity.js';
import { CitySource, CitySourceKindEnum } from '../../entities/city-source.entity.js';

export interface CityTransientParams {
	/** The entity manager to create it in; the global test one (`getEntityManager`) otherwise */
	em?: EntityManager;
}

let sequence = 0;

/**
 * A Berlin-like city with a unique slug: every venue, post and pipeline run needs one. Pass
 * scalars as params; `districts` default to three Berlin districts with their borders.
 */
export const cityFactory = Factory.define<City, CityTransientParams, City>(({ params, transientParams, onCreate }) => {
	const em = transientParams.em ?? getEntityManager();
	onCreate(async city => {
		await em.flush();
		return city;
	});
	sequence++;
	return em.create(City, {
		slug: `test-city-${sequence}`,
		name: 'Berlin',
		country: 'DE',
		timezone: 'Europe/Berlin',
		language: 'de',
		locationQuery: 'Berlin, Germany',
		tiktokRegion: 'DE',
		nameStopwords: ['berlin'],
		districts: [
			{ name: 'Neukölln', postalCodes: [], neighbours: ['Friedrichshain-Kreuzberg'] },
			{ name: 'Friedrichshain-Kreuzberg', postalCodes: [], neighbours: ['Neukölln', 'Mitte'] },
			{ name: 'Mitte', postalCodes: [], neighbours: ['Friedrichshain-Kreuzberg'] },
		],
		...params,
	} as City);
});

/** A test city in this entity manager, not flushed: `em.create(Venue, { city: testCity(em), … })`. */
export const testCity = (em: EntityManager, params: Partial<City> = {}): City =>
	cityFactory.build(params, { transient: { em } });

/** A source of the city, not flushed. */
export const testCitySource = (
	em: EntityManager,
	city: City,
	kind: CitySourceKindEnum,
	value: string,
	enabled = true,
): CitySource => em.create(CitySource, { city, kind, value, enabled });
