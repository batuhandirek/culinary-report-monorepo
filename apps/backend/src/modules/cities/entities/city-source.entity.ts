import type { Rel } from '@mikro-orm/core';
import { Entity, Enum, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { Hashtag } from 'src/modules/social/entities/hashtag.entity.js';
import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { City } from './city.entity.js';

export enum CitySourceKindEnum {
	TIKTOK_HASHTAG = 'tiktok_hashtag',
	TIKTOK_SEARCH = 'tiktok_search',
	INSTAGRAM_HASHTAG = 'instagram_hashtag',
	// A food blog or a magazine's food section: `value` is its URL (the site, a section or the
	// feed itself), read through its RSS or Atom feed by the free `SCRAPE_BLOGS`
	BLOG = 'blog',
	// One creator's profile, watched every week (`SCRAPE_ACCOUNTS_RECENT`) and at month end:
	// `value` is the handle, lowercase, without the @
	TIKTOK_ACCOUNT = 'tiktok_account',
	INSTAGRAM_ACCOUNT = 'instagram_account',
}

/**
 * Where a city's scrapes look: a hashtag (without `#`), a search query, a blog's URL or an
 * account's handle. Every post
 * it finds gets a `PostSource` row pointing at it, so its yield, and what only it found, can be
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

	// A hashtag source's tag (`Hashtag`), so "does the city scrape this tag" is a join
	@ManyToOne({ entity: () => Hashtag, nullable: true, deleteRule: 'set null', index: true })
	hashtag?: Rel<Hashtag> | null;

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
