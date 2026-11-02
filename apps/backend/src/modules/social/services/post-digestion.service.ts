import { FilterQuery, QueryOrder } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import { STATEMENT_POPULATE } from 'src/modules/statements/util/statement-populate.js';

import {
	PostSkipReasonEnum,
	SocialPlatformEnum,
	SocialPost,
} from '../entities/social-post.entity.js';

/** How far the pipeline got with a post: read by agent A, turned away by the gate, or neither yet */
export type PostDigestionStatus = 'digested' | 'skipped' | 'unread';

export interface PostDigestionFilters {
	cityId?: string;
	platform?: SocialPlatformEnum;
	status?: PostDigestionStatus;
	/** Skipped for this reason (implies `skipped`) */
	skipReason?: PostSkipReasonEnum;
	/** Words in its caption, transcript or article */
	q?: string;
}

/** A post's status, as the filters above select it */
export const postDigestionStatus = (
	post: Pick<SocialPost, 'skipReason' | 'analysedAt'>,
): PostDigestionStatus =>
	post.skipReason ? 'skipped'
	: post.analysedAt ? 'digested'
	: 'unread';

/** What a Digestion row reads of a post: who posted it, its city, and its places and claims to count */
export const POST_DIGESTION_ROW_POPULATE = [
	'account',
	'account.creator',
	'city',
	'mentions',
	'statements',
] as const;

/** What the expanded row reads: every step's result, the claims with their parts (`STATEMENT_POPULATE`) */
export const DIGESTED_POST_POPULATE = [
	'account',
	'account.creator',
	'account.brand',
	'city',
	'hashtagLinks',
	'hashtagLinks.hashtag',
	'hashtagLinks.hashtag.topic',
	'hashtagLinks.hashtag.brand',
	'mentions',
	'mentions.venue',
	'mentions.brand',
	...STATEMENT_POPULATE,
] as const;

export const DIGESTED_POST_EXCLUDE = [
	'account.creator.accounts',
	'account.brand.branches',
	'mentions.brand.branches',
	'mentions.statements',
	'hashtagLinks.hashtag.brand.branches',
] as const;

/**
 * The Digestion page's read of posts (`/admin/digestion`): which posts a filter keeps, newest first,
 * and each one with what the gate, agent A and agent B made of it. Reads only.
 */
@Injectable()
export class PostDigestionService {
	constructor(private readonly em: EntityManager) {}

	private where(filters: PostDigestionFilters): FilterQuery<SocialPost> {
		const where: FilterQuery<SocialPost> = {};
		if (filters.cityId) where.city = filters.cityId;
		if (filters.platform) where.platform = filters.platform;
		if (filters.skipReason) where.skipReason = filters.skipReason;
		else if (filters.status === 'skipped') where.skipReason = { $ne: null };
		else if (filters.status === 'digested')
			Object.assign(where, { skipReason: null, analysedAt: { $ne: null } });
		else if (filters.status === 'unread')
			Object.assign(where, { skipReason: null, analysedAt: null });
		if (filters.q) {
			const like = `%${filters.q}%`;
			where.$or = [
				{ text: { $ilike: like } },
				{ subtitles: { $ilike: like } },
				{ locationName: { $ilike: like } },
			];
		}
		return where;
	}

	/**
	 * The newest `limit` posts the filters keep, as ids and dates (for merging with the reviews'),
	 * and how many they keep in all. Read in a fork, so the partial rows stay out of the request's
	 * identity map.
	 */
	async newest(
		filters: PostDigestionFilters,
		limit: number,
	): Promise<{ total: number; keys: { id: string; at: Date }[] }> {
		const [posts, total] = await this.em.fork().findAndCount(SocialPost, this.where(filters), {
			fields: ['id', 'postedAt'],
			orderBy: { postedAt: QueryOrder.DESC, id: QueryOrder.DESC },
			limit,
		});
		return { total, keys: posts.map(post => ({ id: post.id, at: post.postedAt })) };
	}

	/** The posts with these ids, with `POST_DIGESTION_ROW_POPULATE` */
	async rows(ids: string[]): Promise<SocialPost[]> {
		if (!ids.length) return [];
		return this.em.find(
			SocialPost,
			{ id: { $in: ids } },
			{ populate: [...POST_DIGESTION_ROW_POPULATE] },
		);
	}

	/** One post with `DIGESTED_POST_POPULATE`; throws when there is none */
	async detail(id: string): Promise<SocialPost> {
		return this.em.findOneOrFail(SocialPost, { id }, { populate: [...DIGESTED_POST_POPULATE] });
	}
}
