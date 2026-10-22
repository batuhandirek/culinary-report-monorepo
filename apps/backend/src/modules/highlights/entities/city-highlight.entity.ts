import type { Rel } from '@mikro-orm/core';
import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { City } from 'src/modules/cities/entities/city.entity.js';
import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import type { CityHighlightData } from '../interfaces/city-highlight.interface.js';

/**
 * A city's month as the public page `/<city>/<month>` shows it: computed once by
 * `CityHighlightService.build` (rebuilding replaces `data`), public only once an admin publishes
 * it, never automatically.
 */
@Entity({ tableName: 'city_highlights' })
@Unique({ properties: ['city', 'month'] })
export class CityHighlight extends MikroOrmEntityAbstractClass<'publishedAt'> {
	@ManyToOne({ entity: () => City, deleteRule: 'cascade' })
	city: Rel<City>;

	// `YYYY-MM`, UTC
	@Property({ type: 'text' })
	month: string;

	@Property({ type: 'jsonb' })
	data: CityHighlightData;

	// When `data` was last computed: corrections made since need a rebuild to show
	@Property({ type: 'datetime' })
	builtAt: Date;

	// Set by an admin's publish, cleared by unpublish; the public route answers 404 without it
	@Property({ type: 'datetime', nullable: true })
	publishedAt?: Date | null;
}
