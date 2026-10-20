import type { Rel } from '@mikro-orm/core';
import { Entity, Enum, Index, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { City } from 'src/modules/cities/entities/city.entity.js';
import { FoodTopic } from 'src/modules/food-topics/entities/food-topic.entity.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import { SearchTermKindEnum } from './trend-search-interest.entity.js';

/**
 * One query of Google Trends' "Related queries" box for a searched term (`TrendSearchInterest`'s
 * term), in the city's region over the twelve months ending with `month`: the pull's window, not
 * the month alone. Top queries carry 0–100 against the most searched one; rising ones the percent
 * growth against the window before, `breakout` past +5,000 %. Written by `SearchInterestService`
 * only; a later pull of the same month replaces the term's rows.
 */
@Entity({ tableName: 'trend_related_queries' })
@Unique({ properties: ['city', 'kind', 'term', 'month', 'rising', 'query'] })
@Index({ properties: ['city', 'month'] })
export class TrendRelatedQuery extends MikroOrmSimpleEntityAbstractClass<'breakout'> {
	@ManyToOne({ entity: () => City, deleteRule: 'cascade' })
	city: Rel<City>;

	@Enum({ items: () => SearchTermKindEnum, nativeEnumName: 'search_term_kind' })
	kind: SearchTermKindEnum;

	// The searched term, as `TrendSearchInterest.term` stores it
	@Property({ type: 'text' })
	term: string;

	@ManyToOne({ entity: () => FoodTopic, deleteRule: 'cascade', nullable: true })
	topic?: Rel<FoodTopic> | null;

	@ManyToOne({ entity: () => Brand, deleteRule: 'cascade', nullable: true })
	brand?: Rel<Brand> | null;

	// YYYY-MM: the last month of the pulled window
	@Property({ type: 'text' })
	month: string;

	// Rising against the window before, else top
	@Property({ type: 'boolean' })
	rising: boolean;

	// Its place in Google's list, from 1
	@Property({ type: 'integer' })
	rank: number;

	@Property({ type: 'text' })
	query: string;

	@Property({ type: 'integer' })
	value: number;

	@Property({ type: 'boolean', default: false })
	breakout: boolean = false;
}
