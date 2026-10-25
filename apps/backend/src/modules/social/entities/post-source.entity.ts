import type { Rel } from '@mikro-orm/core';
import { Entity, Enum, Index, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { CitySource } from 'src/modules/cities/entities/city-source.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import { SocialPost } from './social-post.entity.js';

/** What found a post: one of a city's sources, a search for one venue, or the author's own profile. */
export enum PostSourceKindEnum {
	TIKTOK_HASHTAG = 'tiktok_hashtag',
	TIKTOK_SEARCH = 'tiktok_search',
	INSTAGRAM_HASHTAG = 'instagram_hashtag',
	BLOG = 'blog',
	// TikTok's search for a venue's name (`scrapeVenueSocial`)
	VENUE_SEARCH = 'venue_search',
	// The Instagram page of a venue's place (`scrapeVenueSocial`)
	VENUE_PLACE = 'venue_place',
	// The account's own profile (`AccountScrapeService`): a creator the city watches (a city
	// source of the same kind and value) or a watched brand's own account (no city source)
	TIKTOK_ACCOUNT = 'tiktok_account',
	INSTAGRAM_ACCOUNT = 'instagram_account',
}

/**
 * One find of a post: a row per source that found it, new or known (`SocialPostService.upsert`),
 * so a source's yield, and what only it found, can be counted. `value` is what the scrape
 * looked for (a tag without `#`, a query, a blog's URL, the venue's search name, the profile's handle) and stays when
 * the source is gone; `source` is the city's `CitySource` it is, `venue` the venue a venue find
 * was for.
 */
@Entity({ tableName: 'post_sources' })
@Unique({ properties: ['post', 'kind', 'value'] })
export class PostSource extends MikroOrmSimpleEntityAbstractClass {
	@ManyToOne({ entity: () => SocialPost, deleteRule: 'cascade' })
	post: Rel<SocialPost>;

	@Enum({ items: () => PostSourceKindEnum, nativeEnumName: 'post_source_kind' })
	kind: PostSourceKindEnum;

	@Property({ type: 'text' })
	value: string;

	@Index()
	@ManyToOne({ entity: () => CitySource, nullable: true, deleteRule: 'set null' })
	source?: Rel<CitySource> | null;

	@ManyToOne({ entity: () => Venue, nullable: true, deleteRule: 'set null', index: true })
	venue?: Rel<Venue> | null;

	@Property({ type: 'datetime' })
	foundAt: Date;
}
