import type { Rel } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { City } from 'src/modules/cities/entities/city.entity.js';
import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { Venue } from './venue.entity.js';

/**
 * A food or drink place OpenStreetMap lists in a city: the checklist the venue list is measured
 * against. Written by `OsmPlaceService` only (`SYNC_OSM_PLACES`, `LOOKUP_OSM_PLACES`); the
 * venue's own data always comes from Google, never from here.
 */
@Entity({ tableName: 'osm_places' })
export class OsmPlace extends MikroOrmEntityAbstractClass<'tags'> {
	@Index()
	@ManyToOne({ entity: () => City })
	city: Rel<City>;

	// OSM's own key, e.g. "node/123456" or "way/789"
	@Property({ type: 'text', unique: true })
	osmKey: string;

	@Property({ type: 'text' })
	name: string;

	// The OSM tag value that made it a food place: "restaurant", "cafe", "bakery", …
	@Property({ type: 'text' })
	kind: string;

	// A way's centre for buildings
	@Property({ type: 'double' })
	lat: number;

	@Property({ type: 'double' })
	lng: number;

	@Property({ type: 'text', nullable: true })
	street?: string | null;

	@Property({ type: 'text', nullable: true })
	houseNumber?: string | null;

	@Property({ type: 'text', nullable: true })
	postalCode?: string | null;

	// Every OSM tag as listed (cuisine, website, opening_hours, brand, …)
	@Property({ type: 'jsonb' })
	tags: Record<string, string> = {};

	// The last sync that listed it: one listed before the city's last sync is gone from OSM
	@Property({ type: 'datetime' })
	seenAt: Date;

	// The venue it is (`matchOsmPlace`); null while none is known
	@Index()
	@ManyToOne({ entity: () => Venue, nullable: true, deleteRule: 'set null' })
	venue?: Rel<Venue> | null;

	// When it was searched on Google Maps by name and address: never paid for twice
	@Property({ type: 'datetime', nullable: true })
	lookedUpAt?: Date | null;
}
