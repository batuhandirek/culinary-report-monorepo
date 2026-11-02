import { FilterQuery, QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { STATEMENT_POPULATE } from 'src/modules/statements/util/statement-populate.js';

import { Review, ReviewPlatformEnum } from '../entities/review.entity.js';

/** How far the pipeline got with a review: read by agent A, or not yet (no gate skips a review) */
export type ReviewDigestionStatus = 'digested' | 'unread';

export interface ReviewDigestionFilters {
	/** Its venue's city */
	cityId?: string;
	platform?: ReviewPlatformEnum;
	status?: ReviewDigestionStatus;
	/** Words in its text or translation */
	q?: string;
}

export const reviewDigestionStatus = (review: Pick<Review, 'analysedAt'>): ReviewDigestionStatus =>
	review.analysedAt ? 'digested' : 'unread';

/** What a Digestion row reads of a review: its venue (and the venue's brand and city) and its claims to count */
export const REVIEW_DIGESTION_ROW_POPULATE = [
	'venue',
	'venue.brand',
	'venue.city',
	'statements',
] as const;

/** What the expanded row reads: the claims with their parts (`STATEMENT_POPULATE`) */
export const DIGESTED_REVIEW_POPULATE = [
	'venue',
	'venue.brand',
	'venue.city',
	...STATEMENT_POPULATE,
] as const;

export const DIGESTED_REVIEW_EXCLUDE = ['venue.brand.branches'] as const;

/**
 * The Digestion page's read of reviews (`/admin/digestion`): which reviews a filter keeps, newest
 * first, and each one with what agents A and B made of it. Reads only.
 */
@Injectable()
export class ReviewDigestionService {
	constructor(private readonly em: EntityManager) {}

	private where(filters: ReviewDigestionFilters): FilterQuery<Review> {
		const where: FilterQuery<Review> = {};
		if (filters.cityId) where.venue = { city: filters.cityId };
		if (filters.platform) where.platform = filters.platform;
		if (filters.status === 'digested') where.analysedAt = { $ne: null };
		else if (filters.status === 'unread') where.analysedAt = null;
		if (filters.q) {
			const like = `%${filters.q}%`;
			where.$or = [{ text: { $ilike: like } }, { textTranslated: { $ilike: like } }];
		}
		return where;
	}

	/**
	 * The newest `limit` reviews the filters keep, as ids and dates (for merging with the posts'),
	 * and how many they keep in all. Read in a fork, so the partial rows stay out of the request's
	 * identity map.
	 */
	async newest(
		filters: ReviewDigestionFilters,
		limit: number,
	): Promise<{ total: number; keys: { id: string; at: Date }[] }> {
		const [reviews, total] = await this.em.fork().findAndCount(Review, this.where(filters), {
			fields: ['id', 'publishedAt'],
			orderBy: { publishedAt: QueryOrder.DESC, id: QueryOrder.DESC },
			limit,
		});
		return { total, keys: reviews.map(review => ({ id: review.id, at: review.publishedAt })) };
	}

	/** The reviews with these ids, with `REVIEW_DIGESTION_ROW_POPULATE` */
	async rows(ids: string[]): Promise<Review[]> {
		if (!ids.length) return [];
		return this.em.find(
			Review,
			{ id: { $in: ids } },
			{ populate: [...REVIEW_DIGESTION_ROW_POPULATE] },
		);
	}

	/** One review with `DIGESTED_REVIEW_POPULATE`; throws when there is none */
	async detail(id: string): Promise<Review> {
		return this.em.findOneOrFail(Review, { id }, { populate: [...DIGESTED_REVIEW_POPULATE] });
	}
}
