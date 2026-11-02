import { wrap } from '@mikro-orm/core';

import { Injectable } from '@nestjs/common';

import {
	SocialPlatformEnum,
	type SocialPost,
} from 'src/modules/social/entities/social-post.entity.js';
import {
	DIGESTED_POST_EXCLUDE,
	DIGESTED_POST_POPULATE,
	PostDigestionService,
	postDigestionStatus,
} from 'src/modules/social/services/post-digestion.service.js';
import type { Statement } from 'src/modules/statements/entities/statement.entity.js';
import { type Review, ReviewPlatformEnum } from 'src/modules/venues/entities/review.entity.js';
import {
	DIGESTED_REVIEW_EXCLUDE,
	DIGESTED_REVIEW_POPULATE,
	ReviewDigestionService,
	reviewDigestionStatus,
} from 'src/modules/venues/services/review-digestion.service.js';

import type {
	AdminDigestedPostOutputDto,
	AdminDigestedReviewOutputDto,
	AdminDigestionInputDto,
	AdminDigestionOutputDto,
	AdminDigestionPostRowOutputDto,
	AdminDigestionReviewRowOutputDto,
	AdminDigestionRowOutputDto,
	AdminDigestionTallyOutputDto,
} from '../dto/admin-digestion.dto.js';

const REVIEW_PLATFORMS: string[] = Object.values(ReviewPlatformEnum);
const POST_PLATFORMS: string[] = Object.values(SocialPlatformEnum);

// How much of a source's text a collapsed row carries
const EXCERPT_CHARS = 160;

/** The start of a text, whitespace folded; nothing for an empty one */
export const excerptOf = (text: string | null | undefined): string | undefined => {
	const folded = text?.replace(/\s+/g, ' ').trim();
	if (!folded) return undefined;
	return folded.length > EXCERPT_CHARS ? `${folded.slice(0, EXCERPT_CHARS).trimEnd()}…` : folded;
};

/** A source's claims by sentiment; one agent B has not read is `unread` whatever it holds */
export const tallyOf = (
	statements: Pick<Statement, 'sentiment' | 'partsAt'>[],
): AdminDigestionTallyOutputDto => {
	const tally: AdminDigestionTallyOutputDto = {
		positive: 0,
		negative: 0,
		neutral: 0,
		mixed: 0,
		unread: 0,
	};
	for (const statement of statements) {
		if (!statement.partsAt || !statement.sentiment) tally.unread += 1;
		else tally[statement.sentiment] += 1;
	}
	return tally;
};

type Key = { kind: 'review' | 'post'; id: string; at: Date };

/**
 * The Digestion page (`/admin/digestion`): every review and post newest first, with what the
 * pipeline made of each. The two sources are read by their own modules and merged here: each gives
 * its newest `offset + size` keys, so a page is exact whatever the mix.
 */
@Injectable()
export class DigestionService {
	constructor(
		private readonly postDigestionService: PostDigestionService,
		private readonly reviewDigestionService: ReviewDigestionService,
	) {}

	async list(query: AdminDigestionInputDto): Promise<AdminDigestionOutputDto> {
		const { page, size, kind, platform, cityId, status, skipReason, q } = query;
		const wantsPosts = kind !== 'review' && (!platform || POST_PLATFORMS.includes(platform));
		// No gate reads a review, so none is ever skipped
		const wantsReviews =
			kind !== 'post' &&
			(!platform || REVIEW_PLATFORMS.includes(platform)) &&
			status !== 'skipped' &&
			!skipReason;
		const offset = (page - 1) * size;
		const limit = offset + size;

		const posts =
			wantsPosts ?
				await this.postDigestionService.newest(
					{
						cityId,
						platform: platform as SocialPlatformEnum | undefined,
						status,
						skipReason,
						q,
					},
					limit,
				)
			:	{ total: 0, keys: [] };
		const reviews =
			wantsReviews ?
				await this.reviewDigestionService.newest(
					{
						cityId,
						platform: platform as ReviewPlatformEnum | undefined,
						status: status as 'digested' | 'unread' | undefined,
						q,
					},
					limit,
				)
			:	{ total: 0, keys: [] };

		const keys: Key[] = [
			...posts.keys.map(key => ({ kind: 'post' as const, ...key })),
			...reviews.keys.map(key => ({ kind: 'review' as const, ...key })),
		]
			.sort(
				(a, b) =>
					b.at.getTime() - a.at.getTime() ||
					(a.id < b.id ? 1
					: a.id > b.id ? -1
					: 0),
			)
			.slice(offset, limit);

		const postRows = await this.postDigestionService.rows(
			keys.filter(k => k.kind === 'post').map(k => k.id),
		);
		const reviewRows = await this.reviewDigestionService.rows(
			keys.filter(k => k.kind === 'review').map(k => k.id),
		);
		const postsById = new Map(postRows.map(post => [post.id, post]));
		const reviewsById = new Map(reviewRows.map(review => [review.id, review]));

		const items = keys.flatMap((key): AdminDigestionRowOutputDto[] => {
			if (key.kind === 'post') {
				const post = postsById.get(key.id);
				return post ? [this.postRow(post)] : [];
			}
			const review = reviewsById.get(key.id);
			return review ? [this.reviewRow(review)] : [];
		});
		return { items, totalItems: posts.total + reviews.total, page, pageSize: size };
	}

	private postRow(post: SocialPost): AdminDigestionRowOutputDto {
		const statements = post.statements.getItems();
		return {
			kind: 'post',
			status: postDigestionStatus(post),
			excerpt: excerptOf(post.text ?? post.subtitles),
			places: post.mentions.length,
			claims: statements.length,
			sentiments: tallyOf(statements),
			post: wrap(post).serialize({
				skipNull: true,
				forceObject: true,
				// The places and claims are loaded only to be counted
				populate: ['account', 'account.creator', 'city'],
				exclude: ['text', 'subtitles', 'account.creator.accounts'],
			}) as unknown as AdminDigestionPostRowOutputDto,
		};
	}

	private reviewRow(review: Review): AdminDigestionRowOutputDto {
		const statements = review.statements.getItems();
		return {
			kind: 'review',
			status: reviewDigestionStatus(review),
			excerpt: excerptOf(review.text ?? review.textTranslated),
			places: 0,
			claims: statements.length,
			sentiments: tallyOf(statements),
			review: wrap(review).serialize({
				skipNull: true,
				forceObject: true,
				// The claims are loaded only to be counted
				populate: ['venue', 'venue.brand', 'venue.city'],
				exclude: [
					'text',
					'textTranslated',
					'ownerResponse',
					'replyDraft',
					...DIGESTED_REVIEW_EXCLUDE,
				],
			}) as unknown as AdminDigestionReviewRowOutputDto,
		};
	}

	async post(id: string): Promise<AdminDigestedPostOutputDto> {
		const post = await this.postDigestionService.detail(id);
		return wrap(post).serialize({
			skipNull: true,
			forceObject: true,
			populate: [...DIGESTED_POST_POPULATE],
			exclude: [...DIGESTED_POST_EXCLUDE],
		}) as unknown as AdminDigestedPostOutputDto;
	}

	async review(id: string): Promise<AdminDigestedReviewOutputDto> {
		const review = await this.reviewDigestionService.detail(id);
		return wrap(review).serialize({
			skipNull: true,
			forceObject: true,
			populate: [...DIGESTED_REVIEW_POPULATE],
			exclude: [...DIGESTED_REVIEW_EXCLUDE],
		}) as unknown as AdminDigestedReviewOutputDto;
	}
}
