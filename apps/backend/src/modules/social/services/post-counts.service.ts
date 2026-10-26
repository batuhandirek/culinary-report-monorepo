import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';

import {
	CLOCKWORKS_MIN_CAP_USD,
	INSTAGRAM_POST_COUNTS_USD,
	POST_COUNTS_AGE_DAYS,
	POST_COUNTS_LATE_DAYS,
	TIKTOK_POST_COUNTS_USD,
} from '../constants/post-counts.constant.js';
import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
import {
	clockworksCounts,
	instagramCounts,
	planCountsRefresh,
	type PostCounts,
	tikTokVideoId,
} from '../util/post-counts.js';

import { SocialPostService } from './social-post.service.js';

// The same actors as the scrapes, given post URLs: one item a post, the counts as the scrapes
// read them; a deleted or private post comes back as an item with `error` and its `url`
const TIKTOK_ACTOR = 'clockworks/tiktok-scraper';
const INSTAGRAM_ACTOR = 'apify/instagram-scraper';

const DAY_MS = 24 * 3600 * 1000;

export interface PostCountsRefreshResult {
	/** Posts at the fixed age whose counts no read at that age gave */
	due: number;
	tiktok: number;
	instagram: number;
	/** Read and now final */
	read: number;
	/** Deleted or private: final as last read */
	gone: number;
	/** Paid for but not in the run's items (the cap, or the actor skipped it): due again tomorrow */
	notReturned: number;
	/** Beyond the budget: due again tomorrow, oldest first */
	waiting: number;
}

/**
 * Reads posts' counts again at the age they are compared at (`POST_COUNTS_AGE_DAYS`): the daily
 * `REFRESH_POST_COUNTS` step. Every post a scrape found younger is read once more, so views and
 * likes compare across posts whatever day a scrape happened to see them.
 */
@Injectable()
export class PostCountsService {
	private readonly logger = new Logger(PostCountsService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly apifyService: ApifyService,
		private readonly socialPostService: SocialPostService,
	) {}

	/**
	 * The city's TikTok and Instagram posts (Instagram only while it is on for the city) at least
	 * `POST_COUNTS_AGE_DAYS` old and younger than `POST_COUNTS_LATE_DAYS` whose counts aren't
	 * final, oldest first. Blog articles have no counts.
	 */
	async due(city: City, now = new Date()): Promise<SocialPost[]> {
		return this.em.find(
			SocialPost,
			{
				city: city.id,
				platform: {
					$in: [SocialPlatformEnum.TIKTOK, ...(city.instagramEnabled ? [SocialPlatformEnum.INSTAGRAM] : [])],
				},
				countsFinalAt: null,
				postedAt: {
					$lte: new Date(now.getTime() - POST_COUNTS_AGE_DAYS * DAY_MS),
					$gt: new Date(now.getTime() - POST_COUNTS_LATE_DAYS * DAY_MS),
				},
			},
			{ orderBy: { postedAt: 'asc', id: 'asc' } },
		);
	}

	/**
	 * Reads the due posts once more, as many as the budget covers (oldest first, the rest wait for
	 * the next day): TikTok and Instagram in one run each, side by side. Each read is final; a post
	 * found deleted or private stays as last read, final. One run failing keeps the other's reads,
	 * then the step fails.
	 */
	async refresh(city: City, budgetUsd: number, now = new Date()): Promise<PostCountsRefreshResult> {
		const due = await this.due(city, now);
		const priceOf = (post: SocialPost) =>
			post.platform === SocialPlatformEnum.TIKTOK ? TIKTOK_POST_COUNTS_USD : INSTAGRAM_POST_COUNTS_USD;
		const plan = planCountsRefresh(due, priceOf, budgetUsd);
		const tiktok = plan.posts.filter(p => p.platform === SocialPlatformEnum.TIKTOK);
		const instagram = plan.posts.filter(p => p.platform === SocialPlatformEnum.INSTAGRAM);
		// Each run's cap is its share of the budget, never under what it plans to spend; TikTok's
		// at least the actor's floor (a cap, not a spend)
		const capOf = (posts: SocialPost[]) => {
			const spend = posts.reduce((sum, p) => sum + priceOf(p), 0);
			return plan.spendUsd ? Math.max(spend, (budgetUsd * spend) / plan.spendUsd) : 0;
		};

		const [tiktokItems, instagramItems] = await Promise.allSettled([
			tiktok.length ?
				this.apifyService.runActor<any>(
					TIKTOK_ACTOR,
					{
						postURLs: tiktok.map(p => p.url),
						shouldDownloadVideos: false,
						shouldDownloadCovers: false,
						shouldDownloadSubtitles: false,
						shouldDownloadSlideshowImages: false,
					},
					{
						maxCostUsd: Math.max(CLOCKWORKS_MIN_CAP_USD, capOf(tiktok)),
						purpose: `tiktok post counts ${city.name}: ${tiktok.length}`,
					},
				)
			:	Promise.resolve([]),
			instagram.length ?
				this.apifyService.runActor<any>(
					INSTAGRAM_ACTOR,
					{ directUrls: instagram.map(p => p.url), resultsType: 'posts', resultsLimit: 1 },
					{ maxCostUsd: capOf(instagram), purpose: `instagram post counts ${city.name}: ${instagram.length}` },
				)
			:	Promise.resolve([]),
		]);

		const at = new Date();
		const byExternalId = new Map(plan.posts.map(p => [p.externalId, p]));
		const byUrl = new Map(plan.posts.map(p => [p.url, p]));
		const settled = new Set<SocialPost>();
		let read = 0;
		let gone = 0;
		const take = (post: SocialPost | undefined, item: any, counts: () => PostCounts) => {
			if (!post || settled.has(post)) return;
			settled.add(post);
			if (item?.error) {
				this.socialPostService.closeCounts(post, at);
				gone++;
				return;
			}
			this.socialPostService.readCounts(post, counts(), at);
			read++;
		};
		if (tiktokItems.status === 'fulfilled')
			for (const item of tiktokItems.value)
				take(
					byExternalId.get(`${item?.id ?? tikTokVideoId(item?.submittedVideoUrl ?? item?.url)}`),
					item,
					() => clockworksCounts(item),
				);
		if (instagramItems.status === 'fulfilled')
			for (const item of instagramItems.value)
				take(
					(item?.id && byExternalId.get(`ig_${`${item.id}`.split('_')[0]}`)) || byUrl.get(item?.inputUrl ?? item?.url),
					item,
					() => instagramCounts(item),
				);
		await this.em.flush();

		const result: PostCountsRefreshResult = {
			due: due.length,
			tiktok: tiktok.length,
			instagram: instagram.length,
			read,
			gone,
			// A failed run's posts are no item's: the step fails and says why
			notReturned: plan.posts.filter(
				p =>
					!settled.has(p) &&
					(p.platform === SocialPlatformEnum.TIKTOK ? tiktokItems : instagramItems).status === 'fulfilled',
			).length,
			waiting: plan.skipped,
		};
		this.logger.log(`Post counts of ${city.name}: ${JSON.stringify(result)}`);
		const failed = [tiktokItems, instagramItems].find(r => r.status === 'rejected');
		if (failed) throw (failed as PromiseRejectedResult).reason;
		return result;
	}
}
