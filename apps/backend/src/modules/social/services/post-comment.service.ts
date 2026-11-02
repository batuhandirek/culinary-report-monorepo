import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import _ from 'lodash';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import type { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { monthRange } from 'src/modules/venues/util/month.js';
import { runPool } from 'src/shared/util/pool.js';

import { CommentDisagreementAgent } from '../agents/comment-disagreement.agent.js';
import { CommentIntentAgent } from '../agents/comment-intent.agent.js';
import {
	PostComment,
	PostCommentIntentEnum,
	PostCommentQuestionTopicEnum,
} from '../entities/post-comment.entity.js';
import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
import { ownPostSql } from '../util/accounts.js';
import { type CommentFields, plainIntent } from '../util/post-comments.js';

// Comments sent to the LLM in one call
// Comments read side by side, one a call
const CONCURRENCY = 10;

/** A post about the venue whose comments were scraped, with what they say. */
export interface PostWithComments {
	postId: string;
	url: string;
	author?: string;
	views: number;
	comments: {
		intent: PostCommentIntentEnum | null;
		questionTopic: PostCommentQuestionTopicEnum | null;
		question: string | null;
		likes: number;
		text: string;
	}[];
	disagreement?: string;
}

/**
 * Comments under the report venues' top TikTok posts: which posts, storing them and their
 * analysis by `CommentIntentAgent`. The scrape itself is `SocialScrapeService.scrapeComments`.
 */
@Injectable()
export class PostCommentService {
	private readonly logger = new Logger(PostCommentService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly commentIntentAgent: CommentIntentAgent,
		private readonly commentDisagreementAgent: CommentDisagreementAgent,
	) {}

	/**
	 * Each brand's most viewed TikTok posts of the month in the city by others, with comments,
	 * whose comments were never scraped: one scrape per post, a rescrape would pay again. The
	 * brands come with their branches (own-account names).
	 */
	async topPosts(
		brands: Brand[],
		cityId: string,
		month: string,
		perBrand = 5,
	): Promise<SocialPost[]> {
		if (!brands.length) return [];
		const { start, end } = monthRange(month);
		const rows: { brand_id: string; post_id: string }[] = await this.em.getConnection().execute(
			`select distinct m.brand_id, p.id as post_id, p.views
			from mentions m
			join social_posts p on p.id = m.post_id
			where m.brand_id in (${brands.map(() => '?').join(', ')}) and p.city_id = ?
				and p.platform = ? and p.posted_at >= ? and p.posted_at < ?
				and p.comments > 0 and p.comments_scraped_at is null
				and not ${ownPostSql('p', 'm.brand_id')}
			order by p.views desc`,
			[...brands.map(b => b.id), cityId, SocialPlatformEnum.TIKTOK, start, end],
		);
		const ids = Object.values(_.groupBy(rows, r => r.brand_id)).flatMap(group =>
			group.slice(0, perBrand).map(r => r.post_id),
		);
		return ids.length ? this.em.find(SocialPost, { id: { $in: _.uniq(ids) } }) : [];
	}

	/**
	 * Stores a post's scraped comments, once per `externalId` (a known one refreshes its likes),
	 * and marks the post scraped. Does not flush.
	 */
	async save(post: SocialPost, rows: CommentFields[]): Promise<number> {
		const unique = _.uniqBy(rows, r => r.externalId);
		const known =
			unique.length ?
				await this.em.find(PostComment, {
					externalId: { $in: unique.map(r => r.externalId) },
				})
			:	[];
		const byId = new Map(known.map(c => [c.externalId, c]));
		for (const row of unique) {
			const existing = byId.get(row.externalId);
			if (existing) {
				existing.likes = row.likes;
				existing.replies = row.replies;
			} else this.em.create(PostComment, { ...row, post });
		}
		post.commentsScrapedAt = new Date();
		return unique.length;
	}

	/**
	 * Classifies the city's comments that have none yet, one post at a time (the agent is told
	 * the venue the post is about). Tags-only and emoji-only comments need no model. Flushes once.
	 */
	async analyse(city: City, limit = 20_000): Promise<{ analysed: number; calls: number }> {
		const comments = await this.em.find(
			PostComment,
			{ analysedAt: null, post: { city } },
			{ populate: ['post'], limit },
		);
		let analysed = 0;
		const now = new Date();
		const rest: PostComment[] = [];
		for (const comment of comments) {
			const intent = plainIntent(comment.text);
			if (!intent) {
				rest.push(comment);
				continue;
			}
			comment.intent = intent;
			comment.analysedAt = now;
			analysed++;
		}

		// The venue each post is about, for the prompt: its matched mention's (the branch, else the brand)
		const postIds = _.uniq(rest.map(c => c.post.id));
		const venueRows: { post_id: string; name: string }[] =
			postIds.length ?
				await this.em.getConnection().execute(
					`select distinct on (m.post_id) m.post_id, coalesce(v.name, b.name) as name
					from mentions m join brands b on b.id = m.brand_id left join venues v on v.id = m.venue_id
					where m.post_id in (${postIds.map(() => '?').join(', ')})
					order by m.post_id, m.created_at`,
					postIds,
				)
			:	[];
		const venueOf = new Map(venueRows.map(r => [r.post_id, r.name]));

		let calls = 0;
		const venueName = (post: SocialPost) =>
			venueOf.get(post.id) ?? post.locationName ?? 'the venue';
		const context = { cityName: city.name };
		// A provider failure (no credits) stops the pool: keep what was finished before it
		try {
			// One comment a call
			await runPool(
				rest,
				CONCURRENCY,
				async comment => {
					calls++;
					const res = await this.commentIntentAgent.generate(
						JSON.stringify({
							venue: venueName(comment.post),
							caption: comment.post.text?.slice(0, 500) ?? null,
							comment: { text: comment.text.slice(0, 400), likes: comment.likes },
						}),
						context,
					);
					comment.intent = res.object.intent;
					const isQuestion = res.object.intent === PostCommentIntentEnum.QUESTION;
					comment.questionTopic =
						isQuestion ?
							(res.object.questionTopic ?? PostCommentQuestionTopicEnum.OTHER)
						:	null;
					comment.question = isQuestion ? res.object.question?.trim() || null : null;
					comment.analysedAt = now;
					analysed++;
				},
				(comment, e) =>
					this.logger.warn(`Comment ${comment.externalId} failed: ${e.message}`),
			);
			// Then one call a post on what its disagreeing comments say
			const disagreeing = Object.values(
				_.groupBy(
					rest.filter(c => c.intent === PostCommentIntentEnum.DISAGREEMENT),
					c => c.post.id,
				),
			);
			await runPool(
				disagreeing,
				CONCURRENCY,
				async group => {
					calls++;
					const res = await this.commentDisagreementAgent.generate(
						JSON.stringify({
							venue: venueName(group[0].post),
							caption: group[0].post.text?.slice(0, 500) ?? null,
							comments: group.map(c => c.text.slice(0, 400)),
						}),
						context,
					);
					group[0].post.commentsDisagreement = res.object.summary.trim() || null;
				},
				(group, e) =>
					this.logger.warn(
						`Disagreement of post ${group[0].post.externalId} failed: ${e.message}`,
					),
			);
		} catch (e) {
			await this.em.flush();
			throw e;
		}
		// One flush at the end: the batches run side by side on this entity manager
		await this.em.flush();
		return { analysed, calls };
	}

	/** A post and its comments, most liked first; 404 for an unknown post. */
	async listForPost(postId: string): Promise<{ post: SocialPost; comments: PostComment[] }> {
		const post = await this.em.findOne(SocialPost, { id: postId });
		if (!post) throw new NotFoundException();
		const comments = await this.em.find(
			PostComment,
			{ post },
			{ orderBy: { likes: 'desc', commentedAt: 'desc' } },
		);
		return { post, comments };
	}

	/**
	 * The month's posts in the city about the brand whose comments were scraped, most viewed
	 * first; its own accounts' posts left out.
	 */
	async forReport(
		brandId: string,
		// Null: every city's posts (a report across the brand's cities)
		cityId: string | null,
		month: string,
	): Promise<PostWithComments[]> {
		const { start, end } = monthRange(month);
		const posts = await this.em.find(
			SocialPost,
			{
				mentions: { brand: brandId },
				...(cityId && { city: cityId }),
				postedAt: { $gte: start, $lt: end },
				commentsScrapedAt: { $ne: null },
			},
			{ populate: ['account'], orderBy: { views: 'desc' } },
		);
		const shown = posts.filter(p => p.account?.brand?.id !== brandId);
		if (!shown.length) return [];
		const comments = await this.em.find(PostComment, { post: { $in: shown.map(p => p.id) } });
		const byPost = _.groupBy(comments, c => c.post.id);
		return shown.map(post => ({
			postId: post.id,
			url: post.url,
			...(post.author && { author: post.author }),
			views: post.views,
			comments: (byPost[post.id] ?? []).map(c => ({
				intent: c.intent ?? null,
				questionTopic: c.questionTopic ?? null,
				question: c.question ?? null,
				likes: c.likes,
				text: c.text,
			})),
			...(post.commentsDisagreement && { disagreement: post.commentsDisagreement }),
		}));
	}
}
