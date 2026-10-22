import type { Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { City } from 'src/modules/cities/entities/city.entity.js';
import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

/**
 * A name searched on Google Maps in a city, so it is not paid for again until it is stale
 * (`LOOKUP_RETRY_MONTHS`): a place creators name before Google lists it is found by the retry.
 */
@Entity({ tableName: 'venue_lookups' })
@Unique({ properties: ['city', 'query'] })
export class VenueLookup extends MikroOrmSimpleEntityAbstractClass<'lookedUpAt'> {
	// The city it was searched in (its `locationQuery`)
	@ManyToOne({ entity: () => City })
	city: Rel<City>;

	// The normalized name (`normalizeVenueName` with the city's stopwords)
	@Property({ type: 'text' })
	query: string;

	@Property({ type: 'int' })
	results: number;

	// The last search; a retry updates it
	@Property({ type: 'datetime', defaultRaw: 'now()' })
	lookedUpAt!: Date;
}
