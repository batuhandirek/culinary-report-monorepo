import type { Rel } from '@mikro-orm/core';
import { Entity, Enum, Index, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { Venue } from './venue.entity.js';

/** How much of the article is about the venue, as the LLM read its title and snippet. */
export enum WebMentionKindEnum {
	// An article or review about the venue
	FEATURE = 'feature',
	// A list of places ("the 10 best brunch spots in Neukölln") with the venue on it
	LISTICLE = 'listicle',
	// Named in passing
	PASSING = 'passing',
	// A namesake, the venue's own site or a directory listing: kept so it isn't asked again
	UNRELATED = 'unrelated',
}

/** Where the search found it. */
export enum WebMentionSourceEnum {
	NEWS = 'news',
	WEB = 'web',
}

/**
 * A press article or web page naming the venue, found by the monthly `SCRAPE_PRESS` search.
 * One row per URL: a page found again keeps its first venue and classification.
 */
@Entity({ tableName: 'web_mentions' })
@Index({ properties: ['venue', 'month'] })
export class WebMention extends MikroOrmEntityAbstractClass {
	@ManyToOne({ entity: () => Venue, deleteRule: 'cascade' })
	venue: Rel<Venue>;

	@Property({ type: 'text', unique: true })
	url: string;

	// The publisher, e.g. "Mit Vergnügen" or "tip-berlin.de"
	@Property({ type: 'text', nullable: true })
	outlet?: string | null;

	@Property({ type: 'text' })
	title: string;

	// The search's snippet, what the classification reads
	@Property({ type: 'text', nullable: true })
	snippet?: string | null;

	// News items carry a date; web results mostly don't
	@Property({ type: 'datetime', nullable: true })
	publishedAt?: Date | null;

	// The month whose search found it, `YYYY-MM`: the report it appears in
	@Property({ type: 'text' })
	month: string;

	@Enum({ items: () => WebMentionSourceEnum, nativeEnumName: 'web_mention_source' })
	source: WebMentionSourceEnum;

	// Filled by the classification
	@Enum({ items: () => WebMentionKindEnum, nativeEnumName: 'web_mention_kind', nullable: true })
	kind?: WebMentionKindEnum | null;

	// One English line on what it says about the venue
	@Property({ type: 'text', nullable: true })
	summary?: string | null;

	@Property({ type: 'datetime', nullable: true })
	analysedAt?: Date | null;
}
