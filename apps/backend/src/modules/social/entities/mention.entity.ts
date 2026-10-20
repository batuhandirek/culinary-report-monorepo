import type { Rel } from '@mikro-orm/core';
import { Entity, Enum, Index, ManyToOne, Property } from '@mikro-orm/decorators/legacy';

import { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import type {
	FeedbackDish,
	FeedbackPoint,
	FeedbackSentiment,
} from 'src/modules/venues/interfaces/feedback.interface.js';
import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import { MentionRepository } from '../repositories/mention.repository.js';

import { SocialPost } from './social-post.entity.js';

export enum MentionMatchMethodEnum {
	// The name is the venue's name
	EXACT = 'exact',
	// Close enough, and clearly ahead of the next candidate
	FUZZY = 'fuzzy',
	// The LLM picked it among close candidates
	LLM = 'llm',
	// Nothing fits yet; retried after a Google Maps lookup adds venues
	NONE = 'none',
	// The venue is in another city
	OTHER_CITY = 'other_city',
	// An admin linked it (or unlinked it, `brand` null): matching never touches it again
	MANUAL = 'manual',
	// An admin marked it as not a venue: no venue, never matched again
	IGNORED = 'ignored',
}

/** One venue talked about in a post, as the LLM read it, and the brand (and branch) it was matched to. */
@Entity({ tableName: 'mentions', repository: () => MentionRepository })
export class Mention extends MikroOrmSimpleEntityAbstractClass {
	@ManyToOne({ entity: () => SocialPost, deleteRule: 'cascade' })
	post: Rel<SocialPost>;

	@Property({ type: 'text' })
	venueName: string;

	// Neighbourhood, street, station or landmark the post gives
	@Property({ type: 'text', nullable: true })
	locationHint?: string | null;

	@Property({ type: 'text', nullable: true })
	cuisine?: string | null;

	@Property({ type: 'text', nullable: true })
	city?: string | null;

	// False when the creator says they have not been there
	@Property({ type: 'boolean' })
	visited: boolean;

	@Property({ type: 'text' })
	sentiment: FeedbackSentiment;

	@Property({ type: 'text' })
	summary: string;

	@Property({ type: 'jsonb' })
	dishes: FeedbackDish[];

	@Property({ type: 'jsonb' })
	praise: FeedbackPoint[];

	@Property({ type: 'jsonb' })
	complaints: FeedbackPoint[];

	// The business it talks about; set whenever it is matched
	@Index()
	@ManyToOne({ entity: () => Brand, nullable: true, deleteRule: 'set null' })
	brand?: Rel<Brand> | null;

	// The branch it talks about, when known: a post naming a chain but no branch has the brand only
	@Index()
	@ManyToOne({ entity: () => Venue, nullable: true, deleteRule: 'set null' })
	venue?: Rel<Venue> | null;

	@Enum({
		items: () => MentionMatchMethodEnum,
		nativeEnumName: 'mention_match_method',
		nullable: true,
	})
	matchMethod?: MentionMatchMethodEnum | null;

	@Property({ type: 'float', nullable: true })
	matchScore?: number | null;

	@Property({ type: 'datetime', nullable: true })
	matchedAt?: Date | null;

	// Why an admin corrected the match
	@Property({ type: 'text', nullable: true })
	matchNote?: string | null;
}
