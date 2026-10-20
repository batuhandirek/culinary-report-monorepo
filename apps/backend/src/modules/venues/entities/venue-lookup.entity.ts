import type { Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { City } from 'src/modules/cities/entities/city.entity.js';
import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

/** A name already searched on Google Maps in a city, so it is never paid for twice. */
@Entity({ tableName: 'venue_lookups' })
@Unique({ properties: ['city', 'query'] })
export class VenueLookup extends MikroOrmSimpleEntityAbstractClass {
	// The city it was searched in (its `locationQuery`)
	@ManyToOne({ entity: () => City })
	city: Rel<City>;

	// The normalized name (`normalizeVenueName` with the city's stopwords)
	@Property({ type: 'text' })
	query: string;

	@Property({ type: 'int' })
	results: number;
}
