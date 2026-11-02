import { Collection, type Rel } from '@mikro-orm/core';
import { Check, Entity, Index, ManyToOne, OneToMany, Property } from '@mikro-orm/decorators/legacy';

import { HalfvecType } from 'pgvector/mikro-orm';

import { City } from 'src/modules/cities/entities/city.entity.js';
import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { PostComment } from 'src/modules/social/entities/post-comment.entity.js';
import { SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { WebMention } from 'src/modules/venues/entities/web-mention.entity.js';
import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import { STATEMENT_EMBEDDING_DIMENSIONS } from '../constants/embeddings.constant.js';
import type { StatementKind } from '../constants/kind.constant.js';
import type { Sentiment } from '../constants/sentiment.constant.js';

import { StatementPart } from './statement-part.entity.js';

/** Where a statement was said. A new source is a new kind and FK column, never a new shape. */
export type StatementSourceKind = 'review' | 'post' | 'comment' | 'press' | 'google_tag';

/** Who a statement is about: the source's place (joined through the source), the statement's city, or nothing */
export type StatementSubject = 'place' | 'city' | 'none';

/** What a stated number measures: a wait in minutes, a price in the city's currency */
export type StatementUnit = 'minutes' | 'money';

/**
 * One claim from one source about one subject: "waited 50 minutes" (negative, 50 minutes),
 * "fries for 10 euros" (neutral, 10 money), "Berlin has increasing prices" (the city), "new owner"
 * (`kind` change). Its parts (`StatementPart`) say what it is about: the aspect agent B chose
 * and the food wordings as the source spelled them, whose topics come through the terms. The
 * **subject is never copied**: a `place` is the review's venue, the mention's brand and venue, the
 * press article's venue or the Google tag's venue, so a re-match or a merge moves every statement
 * with no row rewritten. `StatementService` is the one writer of statements,
 * `StatementPartsService` of their parts.
 */
@Entity({ tableName: 'statements' })
@Check({
	name: 'statements_one_source_check',
	expression:
		'(review_id is not null)::int + (post_id is not null)::int + (comment_id is not null)::int + (web_mention_id is not null)::int + (venue_id is not null)::int = 1',
})
@Index({ properties: ['city', 'month'] })
@Index({ properties: ['venue', 'sourceKind'] })
@Index({
	name: 'statements_embedding_hnsw_index',
	expression:
		'create index "statements_embedding_hnsw_index" on "statements" using hnsw ("embedding" halfvec_cosine_ops)',
})
export class Statement extends MikroOrmSimpleEntityAbstractClass<'count' | 'parts'> {
	@Property({ type: 'text' })
	sourceKind: StatementSourceKind;

	@ManyToOne({ entity: () => Review, nullable: true, deleteRule: 'cascade', index: true })
	review?: Rel<Review> | null;

	/** A post's or a blog article's claim; with `mention` when it is about a place the post names */
	@ManyToOne({ entity: () => SocialPost, nullable: true, deleteRule: 'cascade', index: true })
	post?: Rel<SocialPost> | null;

	@ManyToOne({ entity: () => Mention, nullable: true, deleteRule: 'cascade', index: true })
	mention?: Rel<Mention> | null;

	/** A commenter's claim under a post (no writer yet) */
	@ManyToOne({ entity: () => PostComment, nullable: true, deleteRule: 'cascade', index: true })
	comment?: Rel<PostComment> | null;

	/** A press article's claim (no writer yet) */
	@ManyToOne({ entity: () => WebMention, nullable: true, deleteRule: 'cascade', index: true })
	webMention?: Rel<WebMention> | null;

	/** A Google "people often mention" tag's venue (phase `google-tags-as-statements`) */
	@ManyToOne({ entity: () => Venue, nullable: true, deleteRule: 'cascade' })
	venue?: Rel<Venue> | null;

	@Property({ type: 'text' })
	subject: StatementSubject;

	/** The source's: a review's venue's city, a post's city. Never changes */
	@ManyToOne({ entity: () => City, deleteRule: 'cascade' })
	city: Rel<City>;

	/** YYYY-MM (UTC) of `saidAt`; null for an all-time source (a Google tag) */
	@Property({ type: 'text', nullable: true })
	month?: string | null;

	/** The review's `publishedAt`, the post's `postedAt`, the article's date, the details scrape's */
	@Property({ type: 'datetime' })
	saidAt: Date;

	/** The claim, in English; null on a dish-only statement (a dish a source listed that no claim names) */
	@Property({ type: 'text', nullable: true })
	text?: string | null;

	/**
	 * The source's own words for the claim, in its language ("Die Pommes waren matschig"): a verbatim
	 * substring of the source (whitespace folded), checked by `StatementService` when written; null
	 * when agent A gave none that is, and on rows written before quotes (2026-10-31)
	 */
	@Property({ type: 'text', nullable: true })
	quote?: string | null;

	/** null = not judged (a Google tag) */
	@Property({ type: 'text', nullable: true })
	sentiment?: Sentiment | null;

	/**
	 * What sort of thing it says (`STATEMENT_KINDS`: opinion, fact, change, new item, deal, event,
	 * question, verdict), agent B's answer, final; null until B reads it. A `change` ("new owner",
	 * "portions got smaller") is no praise or complaint whatever its sentiment.
	 */
	@Property({ type: 'text', nullable: true })
	kind?: StatementKind | null;

	/** The number the text states ("waited 40 min": 40), never estimated */
	@Property({ type: 'double', nullable: true })
	amount?: number | null;

	@Property({ type: 'text', nullable: true })
	unit?: StatementUnit | null;

	/** Google's count for a tag; 1 otherwise */
	@Property({ type: 'int', default: 1 })
	count: number = 1;

	/** When agent B read it; null = the `statement-parts` backlog reads it */
	@Property({ type: 'datetime', nullable: true })
	partsAt?: Date | null;

	/**
	 * The claim's text as a vector (`text-embedding-3-large` at 1024 dimensions), for search by
	 * meaning and the missing aspects (`StatementEmbeddingService`, the one writer). A discovery and
	 * search layer, never a count. Lazy, so no other read of statements selects it; never in a DTO.
	 * A claim's text never changes (a re-read writes new rows), so a vector never goes stale.
	 */
	@Property({
		type: HalfvecType,
		length: STATEMENT_EMBEDDING_DIMENSIONS,
		nullable: true,
		hidden: true,
		lazy: true,
	})
	embedding?: number[] | null;

	/** When `embedding` was written; null = the `statement-embeddings` backlog embeds it */
	@Property({ type: 'datetime', nullable: true })
	embeddedAt?: Date | null;

	/** What it is about (`StatementPartsService`), in the order answered */
	@OneToMany(() => StatementPart, part => part.statement, {
		orderBy: { rank: 'asc', id: 'asc' },
		orphanRemoval: true,
	})
	parts = new Collection<StatementPart>(this);
}
