import type { Rel } from '@mikro-orm/core';
import { Entity, Enum, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { City } from './city.entity.js';

export enum CitySourceKindEnum {
	TIKTOK_HASHTAG = 'tiktok_hashtag',
	TIKTOK_SEARCH = 'tiktok_search',
	INSTAGRAM_HASHTAG = 'instagram_hashtag',
}

/**
 * Where a city's monthly scrape looks: a hashtag (without `#`) or a search query. Posts keep
 * it in `SocialPost.source` (`#value` or `search:value`), so its yield can be counted.
 * `createdAt` is when it was added.
 */
@Entity({ tableName: 'city_sources' })
@Unique({ properties: ['city', 'kind', 'value'] })
export class CitySource extends MikroOrmEntityAbstractClass<'enabled' | 'suggested'> {
	@ManyToOne({ entity: () => City, deleteRule: 'cascade' })
	city: Rel<City>;

	@Enum({ items: () => CitySourceKindEnum, nativeEnumName: 'city_source_kind' })
	kind: CitySourceKindEnum;

	@Property({ type: 'text' })
	value: string;

	@Property({ type: 'boolean', default: true })
	enabled: boolean = true;

	@Property({ type: 'text', nullable: true })
	note?: string | null;

	// Added by `CitySourceSuggestionAgent` and not reviewed yet: disabled until an admin enables
	// it; enabling or turning it off clears the flag (the note keeps the agent's reason)
	@Property({ type: 'boolean', default: false })
	suggested: boolean = false;
}
