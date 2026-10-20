import type { Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import { City } from './city.entity.js';

/**
 * One local day of a city: its weather (Open-Meteo) and its public holiday (Nager.Date). One row
 * per city and date; a later fetch overwrites the figures. Written by `CityDayService` only.
 */
@Entity({ tableName: 'city_days' })
@Unique({ properties: ['city', 'date'] })
export class CityDay extends MikroOrmSimpleEntityAbstractClass {
	@ManyToOne({ entity: () => City, deleteRule: 'cascade' })
	city: Rel<City>;

	// YYYY-MM-DD in the city's time zone
	@Property({ type: 'text' })
	date: string;

	// Highest temperature, °C; null until the weather is fetched
	@Property({ type: 'float', nullable: true })
	tMax?: number | null;

	// Precipitation sum, mm
	@Property({ type: 'float', nullable: true })
	rainMm?: number | null;

	// The public holiday's English name, when the day is one in the city's region
	@Property({ type: 'text', nullable: true })
	holiday?: string | null;
}
