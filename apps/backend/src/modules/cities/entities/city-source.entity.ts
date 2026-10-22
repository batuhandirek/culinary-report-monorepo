import type { Rel } from '@mikro-orm/core';
import { Entity, Enum, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { City } from './city.entity.js';

export enum CitySourceKindEnum {
	TIKTOK_HASHTAG = 'tiktok_hashtag',
	TIKTOK_SEARCH = 'tiktok_search',
	INSTAGRAM_HASHTAG = 'instagram_hashtag',
	// A food blog or a magazine's food section: `value` is its URL (the site, a section or the
	// feed itself), read through its RSS or Atom feed by the free `SCRAPE_BLOGS`
	BLOG = 'blog',
}

/**
 * Where a city's scrapes look: a hashtag (without `#`), a search query or a blog's URL. Posts
 * keep it in `SocialPost.source` (`#value`, `search:value` or `blog:value`), so its yield can be
 * counted. `createdAt` is when it was added.
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

	// A blog's feed as `SCRAPE_BLOGS` found it (the page's `<link rel="alternate">`, else a usual
	// path), kept so it is not looked for again; looked for again when it stops answering
	@Property({ type: 'text', nullable: true })
	feedUrl?: string | null;

	// When `SCRAPE_BLOGS` last read the blog, and what went wrong then (null when nothing did)
	@Property({ type: 'datetime', nullable: true })
	checkedAt?: Date | null;

	@Property({ type: 'text', nullable: true })
	error?: string | null;
}
