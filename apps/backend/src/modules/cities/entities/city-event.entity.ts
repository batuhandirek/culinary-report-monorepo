import type { Rel } from '@mikro-orm/core';
import { Entity, Enum, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { City } from './city.entity.js';

export enum CityEventKindEnum {
	SCHOOL_HOLIDAY = 'school_holiday',
	EVENT = 'event',
}

/**
 * Something in the city that moves restaurant traffic over a few days: school holidays or a
 * major event (marathon, festival, trade fair), entered by an admin on the city page. Public
 * holidays come by themselves (`CityDay.holiday`).
 */
@Entity({ tableName: 'city_events' })
export class CityEvent extends MikroOrmEntityAbstractClass {
	@ManyToOne({ entity: () => City, deleteRule: 'cascade' })
	city: Rel<City>;

	@Enum({ items: () => CityEventKindEnum, nativeEnumName: 'city_event_kind' })
	kind: CityEventKindEnum;

	@Property({ type: 'text' })
	name: string;

	// YYYY-MM-DD, both days included
	@Property({ type: 'text' })
	startDate: string;

	@Property({ type: 'text' })
	endDate: string;
}
