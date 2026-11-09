import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, NotFoundException } from '@nestjs/common';

import _ from 'lodash';

import type { Brand } from 'src/modules/venues/entities/brand.entity.js';
import { monthRange } from 'src/modules/venues/util/month.js';

import {
	PostComment,
	PostCommentIntentEnum,
	PostCommentQuestionTopicEnum,
} from '../entities/post-comment.entity.js';
import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
import { ownPostSql } from '../util/accounts.js';
import { type CommentFields, plainIntent } from '../util/post-comments.js';

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
 * One post's unread comments as the intent agent reads them, as plain data (a workflow stores it;
 * the pipeline builds the messages): the ones a model need not read with their intent
 * (`plainIntent`), the others' text and likes, and the post they are under
 */
export interface CommentsForReading {
	postId: string;
	cityId: string;
	cityName: string;
	/** The venue the post is about: its first matched mention's branch, else brand */
	venue: string;
	caption: string | null;
	plain: { commentId: string; intent: PostCommentIntentEnum }[];
	ask: { commentId: string; text: string; likes: number }[];
}

/** What the intent agent answers on one comment */
export interface CommentIntentFields {
	intent: PostCommentIntentEnum;
	questionTopic?: PostCommentQuestionTopicEnum | null;
	question?: string | null;
}

/** A post's disagreeing comments, for the disagreement agent's one sentence */
export interface DisagreeingComments {
	venue: string;
	caption: string | null;
	comments: string[];
}

/**
 * Comments under the report venues' top TikTok posts: which posts, storing them, and storing what
 * the reading (the pipeline's `read-comments`) made of them. The scrape itself is
 * `SocialScrapeService.scrapeComments`.
 */
@Injectable()
export class PostCommentService {
	constructor(private readonly em: EntityManager) {}

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

	/** The city's comments not classified yet */
	countUnread(cityId: string): Promise<number> {
		return this.em.count(PostComment, { analysedAt: null, post: { city: cityId } });
	}

	/** The city's posts with comments not read yet: what the reading takes, one post a workflow */
	async postsWithUnreadComments(cityId: string, limit: number): Promise<string[]> {
		const rows = await this.em.getConnection().execute<{ post_id: string }[]>(
			`select distinct c.post_id from post_comments c join social_posts p on p.id = c.post_id
			where c.analysed_at is null and p.city_id = ? order by c.post_id limit ?`,
			[cityId, limit],
		);
		return rows.map(r => r.post_id);
	}

	/** The post's unread comments as the intent agent reads them (`CommentsForReading`); null when none is left unread */
	async commentsForReading(postId: string): Promise<CommentsForReading | null> {
		const comments = await this.em.find(
			PostComment,
			{ analysedAt: null, post: postId },
			{ populate: ['post', 'post.city'] },
		);
		if (!comments.length) return null;
		const post = comments[0].post;
		const plain: CommentsForReading['plain'] = [];
		const ask: CommentsForReading['ask'] = [];
		for (const comment of comments) {
			const intent = plainIntent(comment.text);
			if (intent) plain.push({ commentId: comment.id, intent });
			else ask.push({ commentId: comment.id, text: comment.text, likes: comment.likes });
		}
		return {
			postId: post.id,
			cityId: post.city.id,
			cityName: post.city.name,
			venue: ask.length ? await this.venueNameOf(post) : '',
			caption: post.text ?? null,
			plain,
			ask,
		};
	}

	/**
	 * The post's comments' intents stored: the plain ones and the agent's answers (a question with
	 * its topic, "other" when none, and its wording). Flushes; the disagreeing comments when any,
	 * for the disagreement agent, else null.
	 */
	async saveCommentIntents(
		postId: string,
		plain: CommentsForReading['plain'],
		answers: { commentId: string; answer: CommentIntentFields }[],
	): Promise<DisagreeingComments | null> {
		const comments = await this.em.find(
			PostComment,
			{
				post: postId,
				id: { $in: [...plain.map(p => p.commentId), ...answers.map(a => a.commentId)] },
			},
			{ populate: ['post'] },
		);
		const byId = new Map(comments.map(c => [c.id, c]));
		const now = new Date();
		for (const { commentId, intent } of plain) {
			const comment = byId.get(commentId);
			if (!comment) continue;
			comment.intent = intent;
			comment.analysedAt = now;
		}
		const disagreeing: PostComment[] = [];
		for (const { commentId, answer } of answers) {
			const comment = byId.get(commentId);
			if (!comment) continue;
			comment.intent = answer.intent;
			const isQuestion = answer.intent === PostCommentIntentEnum.QUESTION;
			comment.questionTopic =
				isQuestion ? (answer.questionTopic ?? PostCommentQuestionTopicEnum.OTHER) : null;
			comment.question = isQuestion ? answer.question?.trim() || null : null;
			comment.analysedAt = now;
			if (answer.intent === PostCommentIntentEnum.DISAGREEMENT) disagreeing.push(comment);
		}
		await this.em.flush();
		if (!disagreeing.length) return null;
		const post = disagreeing[0].post;
		return {
			venue: await this.venueNameOf(post),
			caption: post.text ?? null,
			comments: disagreeing.map(c => c.text),
		};
	}

	/** The disagreement agent's line on the post stored. Flushes. */
	async saveDisagreement(postId: string, summary: string): Promise<void> {
		const post = await this.em.findOneOrFail(SocialPost, postId);
		post.commentsDisagreement = summary.trim() || null;
		await this.em.flush();
	}

	/** The venue the post is about, for the prompts: its first matched mention's branch, else brand */
	private async venueNameOf(post: SocialPost): Promise<string> {
		const [row] = await this.em.getConnection().execute<{ name: string }[]>(
			`select coalesce(v.name, b.name) as name
			from mentions m join brands b on b.id = m.brand_id left join venues v on v.id = m.venue_id
			where m.post_id = ? order by m.created_at limit 1`,
			[post.id],
		);
		return row?.name ?? post.locationName ?? 'the venue';
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
