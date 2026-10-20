import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import { FoodTopicService } from 'src/modules/food-topics/services/food-topic.service.js';
import { monthRange } from 'src/modules/venues/util/month.js';
import { runPool } from 'src/shared/util/pool.js';

import { MentionExtractionAgent } from '../agents/mention-extraction.agent.js';
import { Mention } from '../entities/mention.entity.js';
import { SocialPost } from '../entities/social-post.entity.js';

// A caption shorter than this (without hashtags) rarely names a venue
const MIN_CAPTION_CHARS = 60;

@Injectable()
export class MentionExtractionService {
	private readonly logger = new Logger(MentionExtractionService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly mentionExtractionAgent: MentionExtractionAgent,
		private readonly foodTopicService: FoodTopicService,
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
						this.em.create(Mention, { post, ...m });
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

	private prompt(post: SocialPost): string {
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
