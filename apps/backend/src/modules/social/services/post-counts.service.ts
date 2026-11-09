import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import type { ActorCall } from 'src/modules/apify/actors/actor.js';
import {
	INSTAGRAM_SCRAPER_ACTOR,
	type InstagramScraperInput,
	type InstagramScraperItem,
} from 'src/modules/apify/actors/instagram-scraper.actor.js';
import {
	TIKTOK_SCRAPER_ACTOR,
	type TiktokScraperInput,
	type TiktokScraperItem,
} from 'src/modules/apify/actors/tiktok-scraper.actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';

import {
	CLOCKWORKS_MIN_CAP_USD,
	INSTAGRAM_POST_COUNTS_USD,
	POST_COUNTS_AGE_DAYS,
	POST_COUNTS_LATE_DAYS,
	TIKTOK_POST_COUNTS_USD,
} from '../constants/post-counts.constant.js';
import { MentionMatchMethodEnum } from '../entities/mention.entity.js';
import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
import {
	clockworksCounts,
	instagramCounts,
	planCountsRefresh,
	type PostCounts,
	tikTokVideoId,
} from '../util/post-counts.js';

import { SocialPostService } from './social-post.service.js';

// The same actors as the scrapes, given post URLs (`TIKTOK_SCRAPER_ACTOR`, `INSTAGRAM_SCRAPER_ACTOR`):
// one item a post, the counts as the scrapes read them; a deleted or private post comes back as an
// item with `error` and its `url`

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

/** One platform's run of the refresh: the posts it reads, in the plan's order, and the call */
export interface PostCountsRun<Input extends object, Item> {
	postIds: string[];
	call: ActorCall<Input, Item>;
}

/** What `plan` hands the `post-counts` workflow: the two runs (none for a platform without due posts) */
export interface PostCountsPlan {
	due: number;
	waiting: number;
	tiktok: PostCountsRun<TiktokScraperInput, TiktokScraperItem> | null;
	instagram: PostCountsRun<InstagramScraperInput, InstagramScraperItem> | null;
}

/** The runs' records as the workflow hands them to `save`: null for a run that failed */
export interface PostCountsRecords {
	tiktok?: string | null;
	instagram?: string | null;
}

/**
 * Reads posts' counts again at the age they are compared at (`POST_COUNTS_AGE_DAYS`): the daily
 * `post-counts` operation's `plan` and `save` around its two actor children. Every post a scrape
 * found younger is read once more, so views and likes compare across posts whatever day a scrape
 * happened to see them.
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
	 * final, oldest first. Blog articles have no counts, and a brand's own posts are left out: the
	 * weekly own-account scrape reads them again at that age (`OWN_ACCOUNTS_RECENT_DAYS`). Only
	 * posts about eating and drinking out are read (the user's call, 2026-11-05: a fifth of the
	 * reads were music videos and outfits a search had caught, at $0.004 each): one the gate
	 * skipped never is, one not read yet is (it may be), and one read before the gate existed
	 * (`gatedAt` null) only when it names a place, until the re-read gates it.
	 */
	async due(city: City, now = new Date()): Promise<SocialPost[]> {
		return this.em.find(
			SocialPost,
			{
				city: city.id,
				platform: {
					$in: [
						SocialPlatformEnum.TIKTOK,
						...(city.instagramEnabled ? [SocialPlatformEnum.INSTAGRAM] : []),
					],
				},
				countsFinalAt: null,
				skipReason: null,
				$and: [
					// A brand's own post is read again by the weekly own-account scrape, which looks back
					// `OWN_ACCOUNTS_RECENT_DAYS` and so sees each post again at 7 to 14 days old for free
					{ $or: [{ account: null }, { account: { brand: null } }] },
					{
						$or: [
							{ analysedAt: null },
							{ gatedAt: { $ne: null } },
							{
								// A mention there is (a missing one would pass `matchMethod: null`), not ignored
								mentions: {
									id: { $ne: null },
									$or: [
										{ matchMethod: null },
										{ matchMethod: { $ne: MentionMatchMethodEnum.IGNORED } },
									],
								},
							},
						],
					},
				],
				postedAt: {
					$lte: new Date(now.getTime() - POST_COUNTS_AGE_DAYS * DAY_MS),
					$gt: new Date(now.getTime() - POST_COUNTS_LATE_DAYS * DAY_MS),
				},
			},
			{ orderBy: { postedAt: 'asc', id: 'asc' } },
		);
	}

	/**
	 * The refresh's runs: the due posts, as many as the budget covers (oldest first, the rest wait
	 * for the next day), TikTok's and Instagram's in one run each. Each run's cap is its share of
	 * the budget, never under what it plans to spend; TikTok's at least the actor's floor (a cap,
	 * not a spend).
	 */
	async plan(city: City, budgetUsd: number, now: Date): Promise<PostCountsPlan> {
		const due = await this.due(city, now);
		const priceOf = (post: SocialPost) =>
			post.platform === SocialPlatformEnum.TIKTOK ?
				TIKTOK_POST_COUNTS_USD
			:	INSTAGRAM_POST_COUNTS_USD;
		const plan = planCountsRefresh(due, priceOf, budgetUsd);
		const tiktok = plan.posts.filter(p => p.platform === SocialPlatformEnum.TIKTOK);
		const instagram = plan.posts.filter(p => p.platform === SocialPlatformEnum.INSTAGRAM);
		const capOf = (posts: SocialPost[]) => {
			const spend = posts.reduce((sum, p) => sum + priceOf(p), 0);
			return plan.spendUsd ? Math.max(spend, (budgetUsd * spend) / plan.spendUsd) : 0;
		};
		return {
			due: due.length,
			waiting: plan.skipped,
			tiktok:
				tiktok.length ?
					{
						postIds: tiktok.map(p => p.id),
						call: {
							actor: TIKTOK_SCRAPER_ACTOR,
							input: {
								postURLs: tiktok.map(p => p.url),
								shouldDownloadVideos: false,
								shouldDownloadCovers: false,
								shouldDownloadSubtitles: false,
								shouldDownloadSlideshowImages: false,
							},
							maxCostUsd: Math.max(CLOCKWORKS_MIN_CAP_USD, capOf(tiktok)),
							purpose: `tiktok post counts ${city.name}: ${tiktok.length}`,
						},
					}
				:	null,
			instagram:
				instagram.length ?
					{
						postIds: instagram.map(p => p.id),
						call: {
							actor: INSTAGRAM_SCRAPER_ACTOR,
							input: {
								directUrls: instagram.map(p => p.url),
								resultsType: 'posts',
								resultsLimit: 1,
							},
							maxCostUsd: capOf(instagram),
							purpose: `instagram post counts ${city.name}: ${instagram.length}`,
						},
					}
				:	null,
		};
	}

	/**
	 * The runs' items read from their rows: each read is final; a post found deleted or private
	 * stays as last read, final; a post a run didn't return waits for the next day. A failed run
	 * (`null`) reads none of its posts, and the step fails after the other's are saved. Flushes.
	 */
	async save(
		plan: PostCountsPlan,
		records: PostCountsRecords,
		at: Date,
	): Promise<PostCountsRefreshResult> {
		const ids = [...(plan.tiktok?.postIds ?? []), ...(plan.instagram?.postIds ?? [])];
		const posts = ids.length ? await this.em.find(SocialPost, { id: { $in: ids } }) : [];
		const byExternalId = new Map(posts.map(p => [p.externalId, p]));
		const byUrl = new Map(posts.map(p => [p.url, p]));
		const settled = new Set<SocialPost>();
		let read = 0;
		let gone = 0;
		const take = (
			post: SocialPost | undefined,
			item: { error?: string },
			counts: () => PostCounts,
		) => {
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
		if (records.tiktok)
			for (const item of await this.apifyService.storedItems<TiktokScraperItem>(
				records.tiktok,
			))
				take(
					byExternalId.get(
						`${item?.id ?? tikTokVideoId(item?.submittedVideoUrl ?? item?.url)}`,
					),
					item,
					() => clockworksCounts(item),
				);
		if (records.instagram)
			for (const item of await this.apifyService.storedItems<InstagramScraperItem>(
				records.instagram,
			))
				take(
					(item?.id && byExternalId.get(`ig_${`${item.id}`.split('_')[0]}`)) ||
						byUrl.get(item?.inputUrl ?? item?.url ?? ''),
					item,
					() => instagramCounts(item),
				);
		await this.em.flush();

		// A failed run's posts are no item's: the step fails and says why
		const returned = (
			run: PostCountsRun<object, unknown> | null,
			record: string | null | undefined,
		) =>
			run && record ?
				run.postIds.filter(id => !settled.has(posts.find(p => p.id === id)!)).length
			:	0;
		const result: PostCountsRefreshResult = {
			due: plan.due,
			tiktok: plan.tiktok?.postIds.length ?? 0,
			instagram: plan.instagram?.postIds.length ?? 0,
			read,
			gone,
			notReturned:
				returned(plan.tiktok, records.tiktok) + returned(plan.instagram, records.instagram),
			waiting: plan.waiting,
		};
		this.logger.log(`Post counts: ${JSON.stringify(result)}`);
		return result;
	}
}
