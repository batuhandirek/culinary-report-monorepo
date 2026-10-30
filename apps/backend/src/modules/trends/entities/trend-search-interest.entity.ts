import type { Rel } from '@mikro-orm/core';
import { Entity, Enum, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { City } from 'src/modules/cities/entities/city.entity.js';
import { Topic } from 'src/modules/topics/entities/topic.entity.js';
import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

export enum SearchTermKindEnum {
	// A food topic (`Topic`), searched by its Google Trends topic id or query
	TOPIC = 'topic',
	// A won prospect's brand name
	BRAND = 'brand',
}

/**
 * Google search interest in one term, in the city's region, for one month: the mean of Google
 * Trends' weekly 0–100 points of the weeks starting in it. Each term is pulled alone, so 100 is
 * the term's own peak over the pulled twelve months: compare a term with itself over time, never
 * two terms' levels. `interest` is null when Google has too little data, never 0. Written by
 * `SearchInterestService` only; a later pull overwrites the month.
 */
@Entity({ tableName: 'trend_search_interest' })
@Unique({ properties: ['city', 'kind', 'term', 'month'] })
export class TrendSearchInterest extends MikroOrmSimpleEntityAbstractClass {
	@ManyToOne({ entity: () => City, deleteRule: 'cascade' })
	city: Rel<City>;

	@Enum({ items: () => SearchTermKindEnum, nativeEnumName: 'search_term_kind' })
	kind: SearchTermKindEnum;

	// The topic's key or the brand's name
	@Property({ type: 'text' })
	term: string;

	@ManyToOne({ entity: () => Topic, deleteRule: 'cascade', nullable: true })
	topic?: Rel<Topic> | null;

	@ManyToOne({ entity: () => Brand, deleteRule: 'cascade', nullable: true })
	brand?: Rel<Brand> | null;

	// YYYY-MM
	@Property({ type: 'text' })
	month: string;

	@Property({ type: 'float', nullable: true })
	interest?: number | null;
}
