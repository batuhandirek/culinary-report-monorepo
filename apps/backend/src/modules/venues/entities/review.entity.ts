import { Collection, type Rel } from '@mikro-orm/core';
import { Entity, Enum, Index, ManyToOne, OneToMany, Property } from '@mikro-orm/decorators/legacy';

import { FeedbackPoint } from 'src/modules/feedback/entities/feedback-point.entity.js';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import type { FeedbackSentiment } from '../interfaces/feedback.interface.js';
import { ReviewRepository } from '../repositories/review.repository.js';

import { Venue } from './venue.entity.js';

/** Where a review was written. */
export enum ReviewPlatformEnum {
	GOOGLE = 'google',
	// Mostly visitors: the tourist side of a venue
	TRIPADVISOR = 'tripadvisor',
}

/**
 * A Google or TripAdvisor review, stored without the reviewer's personal data. `platform` says
 * which.
 */
@Entity({ tableName: 'reviews', repository: () => ReviewRepository })
@Index({ properties: ['venue', 'publishedAt'] })
export class Review extends MikroOrmEntityAbstractClass<'likes' | 'platform'> {
	// Google's review id, or `ta_<id>` for TripAdvisor
	@Property({ type: 'text', unique: true })
	reviewId: string;

	@Enum({
		items: () => ReviewPlatformEnum,
		nativeEnumName: 'review_platform',
		default: ReviewPlatformEnum.GOOGLE,
	})
	platform: ReviewPlatformEnum = ReviewPlatformEnum.GOOGLE;

	@ManyToOne({ entity: () => Venue, deleteRule: 'cascade' })
	venue: Rel<Venue>;

	@Property({ type: 'datetime' })
	publishedAt: Date;

	@Property({ type: 'int', nullable: true })
	stars?: number | null;

	@Property({ type: 'text', nullable: true })
	text?: string | null;

	@Property({ type: 'text', nullable: true })
	textTranslated?: string | null;

	@Property({ type: 'text', nullable: true })
	language?: string | null;

	@Property({ type: 'int', default: 0 })
	likes: number = 0;

	@Property({ type: 'text', nullable: true })
	ownerResponse?: string | null;

	@Property({ type: 'datetime', nullable: true })
	ownerResponseAt?: Date | null;

	// The owner said in the portal they answered it; a later scrape's `ownerResponse` confirms it
	@Property({ type: 'datetime', nullable: true })
	markedRepliedAt?: Date | null;

	// When the weekly review watch mailed the owner about it: a review alerts once
	@Property({ type: 'datetime', nullable: true })
	alertedAt?: Date | null;

	// A reply the owner can post, drafted for the alert (the reports' drafts live in `ReportData`)
	@Property({ type: 'text', nullable: true })
	replyDraft?: string | null;

	// Filled by the review analysis; what it says is its `feedback` rows
	@Property({ type: 'text', nullable: true })
	sentiment?: FeedbackSentiment | null;


	@Property({ type: 'datetime', nullable: true })
	analysedAt?: Date | null;

	/** What it says, one row per point and per dish no point names (`FeedbackService`) */
	@OneToMany(() => FeedbackPoint, point => point.review, { orderBy: { id: 'asc' }, orphanRemoval: true })
	feedback = new Collection<FeedbackPoint>(this);
}
