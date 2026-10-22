import type { Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { City } from 'src/modules/cities/entities/city.entity.js';
import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import type {
	AnchoredSearchLevels,
	FoodTrendsData,
	FoodTrendsSearchPull,
} from '../interfaces/food-trends.interface.js';

/**
 * A city's quarter of food trends as `/<city>/trends/<YYYY>-q<N>` shows it. The anchored search
 * pull is stored on it (`searchLevels`, written by `FoodTrendsReportService.pullSearches` only);
 * `data` is computed by `build` (a rebuild replaces it) and public only once an admin publishes it.
 */
@Entity({ tableName: 'food_trends_reports' })
@Unique({ properties: ['city', 'quarter'] })
export class FoodTrendsReport extends MikroOrmEntityAbstractClass<
	'data' | 'builtAt' | 'publishedAt' | 'searchLevels' | 'searchPull'
> {
	@ManyToOne({ entity: () => City, deleteRule: 'cascade' })
	city: Rel<City>;

	// `YYYY-qN`, UTC calendar quarters
	@Property({ type: 'text' })
	quarter: string;

	// Null until the first build
	@Property({ type: 'jsonb', nullable: true })
	data?: FoodTrendsData | null;

	@Property({ type: 'datetime', nullable: true })
	builtAt?: Date | null;

	// Set by an admin's publish, cleared by unpublish; the public route answers 404 without it
	@Property({ type: 'datetime', nullable: true })
	publishedAt?: Date | null;

	// The anchored Google Trends pull over the two years ending with the quarter. Its lines hold
	// nulls, which `serialize({ skipNull })` would drop, and the page needs only what `build` makes
	@Property({ type: 'jsonb', nullable: true, hidden: true })
	searchLevels?: AnchoredSearchLevels | null;

	@Property({ type: 'jsonb', nullable: true })
	searchPull?: FoodTrendsSearchPull | null;
}
