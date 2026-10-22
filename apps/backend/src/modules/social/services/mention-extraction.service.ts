import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { FeedbackThemeService, unthemedSql } from 'src/modules/venues/services/feedback-theme.service.js';
import { withTopics } from 'src/modules/venues/util/feedback.js';
import { monthRange } from 'src/modules/venues/util/month.js';
import { normalizeVenueName, plain } from 'src/modules/venues/util/venue-names.js';
import { runPool } from 'src/shared/util/pool.js';

import { MentionExtractionAgent } from '../agents/mention-extraction.agent.js';
import { Mention, MentionMatchMethodEnum } from '../entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';

// A caption shorter than this (without hashtags) rarely names a venue
const MIN_CAPTION_CHARS = 60;

@Injectable()
export class MentionExtractionService {
	private readonly logger = new Logger(MentionExtractionService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly mentionExtractionAgent: MentionExtractionAgent,
		private readonly foodTopicService: FoodTopicService,
		private readonly feedbackThemeService: FeedbackThemeService,
	) {}

	/**
	 * Extracts venue mentions from posts not analysed yet (of one city, or all), most viewed
	 * first. The prompt names the post's city and the food topics, so cuisines use their words.
	 */
	async extract(opts: {
		month?: string;
		limit: number;
		cityId?: string;
	}): Promise<{ analysed: number; mentions: number }> {
		const range = opts.month ? monthRange(opts.month) : null;
		const candidates = await this.em.find(
			SocialPost,
			{
				analysedAt: null,
				...(opts.cityId && { city: opts.cityId }),
				...(range ? { postedAt: { $gte: range.start, $lt: range.end } } : {}),
			},
			{ orderBy: { views: 'desc' }, limit: opts.limit * 2, populate: ['city'] },
		);
		const posts = candidates
			.filter(p => p.subtitles || (p.text ?? '').replaceAll('#', '').trim().length >= MIN_CAPTION_CHARS)
			.slice(0, opts.limit);
		// Too short to name anything: marked analysed so they are not picked up again
		for (const post of candidates.filter(p => !posts.includes(p))) post.analysedAt = new Date();

		const foodTopics = posts.length ? (await this.foodTopicService.all()).map(t => t.label) : [];
		let mentions = 0;
		let analysed = 0;
		// A provider failure (no credits) stops the pool: keep what was finished before it
		try {
			await runPool(
				posts,
				10,
				async post => {
					const res = await this.mentionExtractionAgent.generate(this.prompt(post), {
						cityName: post.city.name,
						foodTopics,
					});
					for (const m of res.object.mentions) {
						// The agent answers a theme per point; the topic is the theme's
						this.em.create(Mention, {
							post,
							...m,
							praise: withTopics(m.praise),
							complaints: withTopics(m.complaints),
						});
						mentions++;
					}
					post.isPromotional = res.object.isPromotional;
					post.analysisTokens = res.usage?.totalTokens ?? null;
					post.analysedAt = new Date();
					analysed++;
				},
				(post, e) => this.logger.warn(`Post ${post.externalId} failed: ${e.message}`),
			);
		} catch (e) {
			await this.em.flush();
			throw e;
		}
		// One flush at the end: the posts run side by side on this entity manager
		await this.em.flush();
		return { analysed, mentions };
	}

	/** Mentions (of one city's posts, or all), newest post first, holding a point without a theme. */
	private async unthemedIds(cityId: string | undefined, limit?: number): Promise<number[]> {
		const rows: { id: number }[] = await this.em.getConnection().execute(
			`select m.id from mentions m join social_posts p on p.id = m.post_id
			where ${unthemedSql('m')} ${cityId ? 'and p.city_id = ?' : ''}
			order by p.posted_at desc, m.id
			${limit ? 'limit ?' : ''}`,
			[...(cityId ? [cityId] : []), ...(limit ? [limit] : [])],
		);
		return rows.map(r => r.id);
	}

	async countUnthemed(cityId?: string): Promise<number> {
		const [row]: { n: number }[] = await this.em.getConnection().execute(
			`select count(*)::int as n from mentions m join social_posts p on p.id = m.post_id
			where ${unthemedSql('m')} ${cityId ? 'and p.city_id = ?' : ''}`,
			cityId ? [cityId] : [],
		);
		return row.n;
	}

	/**
	 * Files the points of up to `limit` mentions extracted before themes existed (newest post
	 * first) under a theme each, through `FeedbackThemeService.fileThemes`: no post is extracted
	 * again, so matches and corrections stay.
	 */
	async backfillThemes(opts: { cityId?: string; limit: number }): Promise<{ mentions: number; points: number }> {
		const ids = await this.unthemedIds(opts.cityId, opts.limit);
		if (!ids.length) return { mentions: 0, points: 0 };
		const mentions = await this.em.find(Mention, { id: { $in: ids } });
		let filed: { holders: number; points: number };
		try {
			filed = await this.feedbackThemeService.fileThemes(mentions);
		} catch (e) {
			await this.em.flush();
			throw e;
		}
		await this.em.flush();
		return { mentions: filed.holders, points: filed.points };
	}

	/**
	 * Reads a month's stored posts with mentions again for `isNewOpening` only, most viewed first
	 * (`offset` / `limit` page through them): each answered venue is paired with the post's stored
	 * mention of the same normalized name (or, one each, with the only one) and that mention takes
	 * the answer's flag. Nothing else is written: no mention is added, a post's analysis stays, and
	 * an admin's correction keeps its venue, brand and note (an `ignored` mention is not a venue and
	 * is never flagged). `extract` can't do this: it adds mentions to posts not analysed yet.
	 */
	async reflagOpenings(opts: {
		month: string;
		cityId?: string;
		analysedBefore?: Date;
		limit: number;
		offset: number;
	}): Promise<{
		total: number;
		posts: number;
		read: number;
		failed: number;
		flaggedMentions: number;
		flaggedPosts: number;
		cleared: number;
		unpaired: number;
		tokens: number;
	}> {
		const range = monthRange(opts.month);
		const where = `p.posted_at >= ? and p.posted_at < ?
			${opts.cityId ? 'and p.city_id = ?' : ''}
			${opts.analysedBefore ? 'and p.analysed_at < ?' : ''}
			and exists (select 1 from mentions m where m.post_id = p.id
				and m.match_method is distinct from '${MentionMatchMethodEnum.IGNORED}')`;
		const params = [
			range.start,
			range.end,
			...(opts.cityId ? [opts.cityId] : []),
			...(opts.analysedBefore ? [opts.analysedBefore] : []),
		];
		const conn = this.em.getConnection();
		const [{ n: total }]: { n: number }[] = await conn.execute(
			`select count(*)::int as n from social_posts p where ${where}`,
			params,
		);
		const ids = (
			(await conn.execute(
				`select p.id from social_posts p where ${where} order by p.views desc, p.id limit ? offset ?`,
				[...params, opts.limit, opts.offset],
			)) as { id: string }[]
		).map(r => r.id);
		const result = {
			total,
			posts: ids.length,
			read: 0,
			failed: 0,
			flaggedMentions: 0,
			flaggedPosts: 0,
			cleared: 0,
			unpaired: 0,
			tokens: 0,
		};
		if (!ids.length) return result;
		const posts = await this.em.find(SocialPost, { id: { $in: ids } }, { populate: ['city', 'mentions'] });
		const foodTopics = (await this.foodTopicService.all()).map(t => t.label);
		const key = (name: string) => normalizeVenueName(name) || plain(name);
		try {
			await runPool(
				posts,
				10,
				async post => {
					const res = await this.mentionExtractionAgent.generate(this.prompt(post), {
						cityName: post.city.name,
						foodTopics,
					});
					const left = [...post.mentions.getItems()];
					const pairs: [Mention, boolean][] = [];
					const unanswered: boolean[] = [];
					for (const answer of res.object.mentions) {
						const i = left.findIndex(m => key(m.venueName) === key(answer.venueName));
						if (i < 0) unanswered.push(answer.isNewOpening);
						else pairs.push([left.splice(i, 1)[0], answer.isNewOpening]);
					}
					// One stored and one answered left: the same venue, spelled another way
					if (left.length === 1 && unanswered.length === 1) pairs.push([left.pop()!, unanswered[0]]);
					let flagged = false;
					for (const [mention, isNewOpening] of pairs) {
						if (mention.matchMethod === MentionMatchMethodEnum.IGNORED) continue;
						if (mention.isNewOpening && !isNewOpening) result.cleared++;
						mention.isNewOpening = isNewOpening;
						if (isNewOpening) {
							result.flaggedMentions++;
							flagged = true;
						}
					}
					if (flagged) result.flaggedPosts++;
					result.unpaired += left.filter(m => m.matchMethod !== MentionMatchMethodEnum.IGNORED).length;
					result.tokens += res.usage?.totalTokens ?? 0;
					result.read++;
				},
				(post, e) => {
					result.failed++;
					this.logger.warn(`Re-flagging post ${post.externalId} failed: ${e.message}`);
				},
			);
		} catch (e) {
			await this.em.flush();
			throw e;
		}
		// One flush at the end: the posts run side by side on this entity manager
		await this.em.flush();
		return result;
	}

	private prompt(post: SocialPost): string {
		if (post.platform === SocialPlatformEnum.BLOG)
			return [`Platform: blog article on ${post.author ?? 'a food blog'}`, `Article:\n${post.text ?? ''}`].join('\n\n');
		return [
			`Platform: ${post.platform}`,
			`Tagged location: ${post.locationName ?? 'none'}`,
			`Hashtags: ${(post.hashtags ?? []).join(', ') || 'none'}`,
			`Mentioned accounts: ${(post.taggedHandles ?? []).join(', ') || 'none'}`,
			`Caption:\n${post.text ?? ''}`,
			post.subtitles ? `Transcript (${post.subtitlesLanguage}):\n${post.subtitles}` : 'Transcript: not available',
		].join('\n\n');
	}
}
