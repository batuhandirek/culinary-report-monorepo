import type { Rel } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import type { VenueSearchRankEntry } from '../interfaces/venue-search-rank.interface.js';

import { Venue } from './venue.entity.js';

/**
 * Where a venue ranked on one Google Maps search ("ramen Mitte") in a month, with the search's
 * top ten. Written by `VenueSearchRankService.track` (`TRACK_SEARCH_RANKS`).
 */
@Entity({ tableName: 'venue_search_ranks' })
@Unique({ properties: ['venue', 'month', 'query'] })
export class VenueSearchRank extends MikroOrmEntityAbstractClass {
	@ManyToOne({ entity: () => Venue, deleteRule: 'cascade' })
	venue: Rel<Venue>;

	// YYYY-MM
	@Index()
	@Property({ type: 'text' })
	month: string;

	// What was typed into Google Maps, e.g. "ramen Mitte"
	@Property({ type: 'text' })
	query: string;

	// 1-based place among the results; null when the venue was not among them
	@Property({ type: 'int', nullable: true })
	rank?: number | null;

	// How many places the search returned (the cap is `SEARCH_RANK_DEPTH`)
	@Property({ type: 'int' })
	results: number;

	// The first ten results, in Google's order
	@Property({ type: 'jsonb' })
	top: VenueSearchRankEntry[];

	@Property({ type: 'datetime' })
	searchedAt: Date;
}
