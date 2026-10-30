import type { Rel } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { City } from 'src/modules/cities/entities/city.entity.js';
import { Topic } from 'src/modules/topics/entities/topic.entity.js';
import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import { Venue } from './venue.entity.js';

/**
 * One place in the top ten of a dish's Google Maps search in one district ("pasta Mitte Berlin")
 * on one day: a snapshot of the rankings that day, one row a place, with Google's figures for it.
 * The day is the city's local date, split out (year, month, week, weekday…) for SQL to group by.
 * Written by `DishSearchService.sweep` (`TRACK_DISH_SEARCHES`); a rerun the same day replaces
 * each search it got back.
 */
@Entity({ tableName: 'dish_search_ranks' })
// Named as the hand-written migration created it (Postgres cut it to 63 characters), so the
// generator sees no difference
@Unique({
	name: 'dish_search_ranks_city_id_topic_id_district_searched_on_rank_un',
	properties: ['city', 'topic', 'district', 'searchedOn', 'rank'],
})
export class DishSearchRank extends MikroOrmSimpleEntityAbstractClass {
	@ManyToOne({ entity: () => City, deleteRule: 'cascade' })
	city: Rel<City>;

	// The dish searched (a `Topic` of kind dish); its key is the word typed
	@ManyToOne({ entity: () => Topic, deleteRule: 'cascade' })
	topic: Rel<Topic>;

	// One of `City.districts`, as typed into the search
	@Property({ type: 'text' })
	district: string;

	// The snapshot: the city's local date of the search, `YYYY-MM-DD`
	@Property({ type: 'date' })
	searchedOn: string;

	@Property({ type: 'int' })
	year: number;

	// `YYYY-MM`, the key monthly tables use
	@Index()
	@Property({ type: 'text' })
	month: string;

	// 1–12
	@Property({ type: 'int' })
	monthOfYear: number;

	@Property({ type: 'int' })
	dayOfMonth: number;

	// 1–366
	@Property({ type: 'int' })
	dayOfYear: number;

	// ISO 8601 week-numbering year: the last days of December can be week 1 of the next one
	@Property({ type: 'int' })
	isoYear: number;

	// ISO 8601 week, Monday first
	@Property({ type: 'int' })
	isoWeek: number;

	// ISO weekday: 1 = Monday … 7 = Sunday
	@Property({ type: 'int' })
	weekday: number;

	// 1-based place in Google's order
	@Property({ type: 'int' })
	rank: number;

	@Property({ type: 'text' })
	placeId: string;

	@Property({ type: 'text' })
	name: string;

	@Property({ type: 'float', nullable: true })
	rating?: number | null;

	@Property({ type: 'int', nullable: true })
	reviewsCount?: number | null;

	// Our venue for the place; none for a place we don't keep (not food, or across the border)
	@Index()
	@ManyToOne({ entity: () => Venue, nullable: true, deleteRule: 'set null' })
	venue?: Rel<Venue> | null;

	@Property({ type: 'datetime' })
	searchedAt: Date;
}
