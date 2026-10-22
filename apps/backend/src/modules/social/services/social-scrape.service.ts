import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CitySourceKindEnum } from 'src/modules/cities/entities/city-source.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { venueSearchName } from 'src/modules/venues/util/brands.js';
import { isSameVenue, plain } from 'src/modules/venues/util/venue-names.js';
import { runPool } from 'src/shared/util/pool.js';

import type { SocialPost } from '../entities/social-post.entity.js';
import { instagramTagUrl } from '../util/instagram-tags.js';
import { fromClockworksComment } from '../util/post-comments.js';

import { PostCommentService } from './post-comment.service.js';
import { PostFields, SocialPostService } from './social-post.service.js';

// clockworks' search fails on device registration; it is still the hashtag actor
const TIKTOK_HASHTAG_ACTOR = 'clockworks/tiktok-scraper';
// Keyword search in the city's region, with subtitle links. `limit` is per keyword, so one run
// covers every query; it refuses a cap under $4
const TIKTOK_SEARCH_ACTOR = 'novi/advanced-search-tiktok-api';
const INSTAGRAM_LOCATION_ACTOR = 'scraping_solutions/instagram-location-posts-local-creator-finder';
// Tag URLs with a date filter; items name their tag (`inputUrl`), so one run covers every hashtag
const INSTAGRAM_HASHTAG_ACTOR = 'apify/instagram-scraper';
// Top-level comments, capped per post; items name their post (`videoWebUrl`)
const TIKTOK_COMMENTS_ACTOR = 'clockworks/tiktok-comments-scraper';

// Free-plan prices per result, to size a run inside its cap (Apify enforces the cap regardless)
const INSTAGRAM_RESULT_USD = 0.0027;
const TIKTOK_COMMENT_USD = 0.00125;
// clockworks' hashtag items, measured: 2,000 for $7.40 on 2026-10-18
const TIKTOK_HASHTAG_RESULT_USD = 0.0037;
// The search actor's smallest `limit`, and the smallest cap it accepts
const TIKTOK_SEARCH_MIN_LIMIT = 30;
const TIKTOK_SEARCH_MIN_CAP_USD = 4;

/** `novi/advanced-search-tiktok-api`'s `publishTime`: how far back a search looks. */
export type TikTokSearchWindow = 'WEEK' | 'THREE_MONTH';

/** `apify/instagram-scraper`'s `resultsType` on a tag URL: the feed's posts, or its top reels. */
export type InstagramHashtagKind = 'posts' | 'reels';

export interface ScrapeResult {
	found: number;
	saved: number;
}

@Injectable()
export class SocialScrapeService {
	private readonly logger = new Logger(SocialScrapeService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly apifyService: ApifyService,
		private readonly socialPostService: SocialPostService,
		private readonly cityService: CityService,
		private readonly postCommentService: PostCommentService,
	) {}

	/**
	 * The comments under these TikTok posts, `perPost` top-level ones at most each, stored without
	 * their authors. One run per post on its share of the budget, its limit sized to that share so
	 * Apify's cap never cuts it. A post is marked scraped even when it returned nothing, so it is
	 * never paid for twice; one whose run failed is not.
	 */
	async scrapeComments(
		posts: SocialPost[],
		perPost: number,
		budgetUsd: number,
	): Promise<{ posts: number; found: number; saved: number }> {
		let found = 0;
		let saved = 0;
		const capUsd = budgetUsd / Math.max(posts.length, 1);
		const limit = Math.max(1, Math.min(perPost, Math.floor(capUsd / TIKTOK_COMMENT_USD)));
		await runPool(
			posts,
			4,
			async post => {
				const items = await this.apifyService.runActor<any>(
					TIKTOK_COMMENTS_ACTOR,
					{ postURLs: [post.url], topLevelCommentsPerPost: limit, commentsPerPost: limit, maxRepliesPerComment: 0 },
					// 1 GB is plenty for one post, and four side by side leave room on the plan's 16 GB
					{ maxCostUsd: capUsd, purpose: `tiktok comments: ${post.externalId}`, memoryMbytes: 1024 },
				);
				found += items.length;
				const rows = items
					// Only the post's own top-level comments
					.filter(item => !item?.repliesToId && isSameVideo(item?.videoWebUrl, post.externalId))
					.map(fromClockworksComment)
					.filter(row => row !== null);
				// Read before adding: `saved += await …` would lose the other workers' counts
				const stored = await this.postCommentService.save(post, rows);
				saved += stored;
			},
			(post, e) => this.logger.warn(`Comments of ${post.url} failed: ${e.message}`),
		);
		await this.em.flush();
		return { posts: posts.length, found, saved };
	}

	/**
	 * The city-wide TikTok scrape: the city's enabled hashtags and searches, searched in its
	 * region, the searches over `searchWindow` (three months without). Videos older than `since`
	 * were paid for but stay out (hashtag feeds have no date filter). Without hashtags the whole
	 * budget goes to the searches, and the other way round. With both, the searches get the larger
	 * of 40 % and the search actor's $4 floor (they spend far less), the hashtags the rest, their
	 * page size cut so the cap never stops the run before the last hashtag.
	 */
	async scrapeCityTikTok(opts: {
		city: City;
		since: string;
		perSource: number;
		budgetUsd: number;
		searchWindow?: TikTokSearchWindow;
	}): Promise<ScrapeResult> {
		const { city } = opts;
		const [hashtags, searches] = await Promise.all([
			this.cityService.enabledValues(city.id, CitySourceKindEnum.TIKTOK_HASHTAG),
			this.cityService.enabledValues(city.id, CitySourceKindEnum.TIKTOK_SEARCH),
		]);
		const searchBudget =
			!searches.length ? 0
			: !hashtags.length ? opts.budgetUsd
			: Math.min(opts.budgetUsd, Math.max(opts.budgetUsd * 0.4, TIKTOK_SEARCH_MIN_CAP_USD));
		const hashtagBudget = opts.budgetUsd - searchBudget;
		const perHashtag = Math.min(
			opts.perSource,
			Math.floor(hashtagBudget / (Math.max(hashtags.length, 1) * TIKTOK_HASHTAG_RESULT_USD)),
		);

		const hashtagItems =
			hashtags.length && perHashtag >= 1 ?
				await this.apifyService.runActor(
					TIKTOK_HASHTAG_ACTOR,
					{
						hashtags,
						resultsPerPage: perHashtag,
						downloadSubtitlesOptions: 'DOWNLOAD_SUBTITLES',
						shouldDownloadVideos: false,
						shouldDownloadCovers: false,
					},
					{ maxCostUsd: hashtagBudget, purpose: `tiktok hashtags ${city.name}: ${hashtags.length}` },
				)
			:	[];
		const hashtagRows = await this.collect(hashtagItems, row => this.socialPostService.fromClockworks(row), opts.since);

		const search = await this.searchTikTok(city, searches, {
			perQuery: opts.perSource,
			budgetUsd: searchBudget,
			window: opts.searchWindow,
			label: `tiktok search ${city.name}: ${searches.length} queries`,
		});
		const rows = [...hashtagRows, ...search.rows.filter(r => r.postedAt.toISOString() >= opts.since)];
		return { found: hashtagItems.length + search.found, saved: await this.saveAll(rows, city) };
	}

	/**
	 * The city-wide Instagram scrape: the city's enabled Instagram hashtags, in one run over all of
	 * them per kind: the tag feed's posts and its top reels (the feed returns no reels). Reels get
	 * a quarter of the budget when both run, as tags have few. Each run's per-hashtag limit is
	 * sized to its share, so Apify's cap never stops it before the last hashtag. On the Free plan
	 * the posts run stops after each tag's first page: the daily `SCRAPE_INSTAGRAM_RECENT` runs
	 * posts only. Nothing runs for a city with Instagram turned off.
	 */
	async scrapeCityInstagram(opts: {
		city: City;
		since: string;
		perSource: number;
		budgetUsd: number;
		kinds?: InstagramHashtagKind[];
	}): Promise<ScrapeResult & { skipped?: string }> {
		const { city } = opts;
		if (!city.instagramEnabled) return { found: 0, saved: 0, skipped: 'Instagram is off for the city' };
		const hashtags = await this.cityService.enabledValues(city.id, CitySourceKindEnum.INSTAGRAM_HASHTAG);
		if (!hashtags.length) return { found: 0, saved: 0 };
		const kinds = opts.kinds ?? ['posts', 'reels'];
		const share = (kind: InstagramHashtagKind) => (kinds.length === 1 ? 1 : kind === 'posts' ? 0.75 : 0.25);
		const runs = kinds.map(kind => ({ resultsType: kind, budgetUsd: opts.budgetUsd * share(kind) }));
		const batches = await Promise.all(
			runs.map(async run => {
				const perHashtag = Math.min(
					opts.perSource,
					Math.floor(run.budgetUsd / (hashtags.length * INSTAGRAM_RESULT_USD)),
				);
				if (perHashtag < 1) return [];
				return this.apifyService
					.runActor<any>(
						INSTAGRAM_HASHTAG_ACTOR,
						{
							directUrls: hashtags.map(instagramTagUrl),
							resultsType: run.resultsType,
							resultsLimit: perHashtag,
							onlyPostsNewerThan: opts.since.slice(0, 10),
						},
						{
							maxCostUsd: run.budgetUsd,
							purpose: `instagram ${run.resultsType} ${city.name}: ${hashtags.length} hashtags`,
						},
					)
					.catch((e: Error) => {
						this.logger.warn(`Instagram ${run.resultsType} of ${city.name} failed: ${e.message}`);
						return [];
					});
			}),
		);
		const items = batches.flat();
		const rows = items
			.map(item => this.socialPostService.fromInstagramHashtag(item))
			// Pinned posts pass the actor's date filter
			.filter((row): row is PostFields => !!row && row.postedAt.toISOString() >= opts.since);
		return { found: items.length, saved: await this.saveAll(rows, city) };
	}

	/**
	 * TikTok searches by venue name (with the city's name, in its region) and Instagram posts
	 * tagged at the venue. The venues are the city's.
	 */
	async scrapeVenueSocial(opts: {
		city: City;
		venues: Venue[];
		since: string;
		perVenue: number;
		budgetUsd: number;
	}): Promise<ScrapeResult> {
		const { city } = opts;
		const searchName = (name: string) => {
			const head = name.split(/\s[|\-–·•]\s|[|]/)[0].trim();
			return plain(head).includes(plain(city.name)) ? head : `${head} ${city.name}`;
		};
		// The search actor refuses a cap under $4, hence the step's $8 default
		const half = opts.budgetUsd / 2;

		const search = await this.searchTikTok(
			city,
			// A branch is searched under its brand's name
			opts.venues.map(v => searchName(venueSearchName(v))),
			{ perQuery: opts.perVenue, budgetUsd: half, label: `tiktok venue search ${city.name}: ${opts.venues.length} venues` },
		);
		const tiktok = search.rows.filter(r => r.postedAt.toISOString() >= opts.since);

		const byInput = new Map(opts.venues.map(v => [searchName(venueSearchName(v)), v]));
		const instagramItems = await this.apifyService.runActor<any>(
			INSTAGRAM_LOCATION_ACTOR,
			{
				locations: [...byInput.keys()],
				resultsPerLocation: opts.perVenue,
				matchStrategy: 'best',
				maximumLocationsPerQuery: 1,
				onlyPostsNewerThan: opts.since.slice(0, 10),
				includeLocationInfo: true,
			},
			{ maxCostUsd: half, purpose: `instagram places: ${opts.venues.length} venues` },
		);
		// Name search sometimes resolves to a namesake place (another country, the city itself)
		const instagram = instagramItems
			.filter(row => {
				const venue = byInput.get(row.input);
				return venue && row.locationName && isSameVenue(row.locationName, venue.name);
			})
			.map(row => this.socialPostService.fromInstagramLocation(row, byInput.get(row.input)!.name))
			.filter((row): row is PostFields => !!row && row.postedAt.toISOString() >= opts.since);

		return {
			found: search.found + instagramItems.length,
			saved: await this.saveAll([...tiktok, ...instagram], city),
		};
	}

	/**
	 * TikTok's search for each query in the city's region over `window` (the last three months
	 * without), by relevance, in one run (the actor's `limit` is per keyword). Rows keep
	 * `search:<query>` from the item. A failed run is logged and yields nothing.
	 */
	private async searchTikTok(
		city: City,
		queries: string[],
		opts: { perQuery: number; budgetUsd: number; label: string; window?: TikTokSearchWindow },
	): Promise<{ found: number; rows: PostFields[] }> {
		if (!queries.length) return { found: 0, rows: [] };
		let items: any[];
		try {
			items = await this.apifyService.runActor<any>(
				TIKTOK_SEARCH_ACTOR,
				{
					keywords: queries,
					limit: Math.max(opts.perQuery, TIKTOK_SEARCH_MIN_LIMIT),
					region: city.tiktokRegion,
					publishTime: opts.window ?? 'THREE_MONTH',
					// Relevance
					sortType: 0,
					includeSearchTerms: true,
				},
				{ maxCostUsd: opts.budgetUsd, purpose: opts.label },
			);
		} catch (e) {
			this.logger.warn(`${opts.label} failed: ${(e as Error).message}`);
			return { found: 0, rows: [] };
		}
		const rows: PostFields[] = [];
		// A video two queries found is downloaded once; the first query keeps it
		for (const item of _.uniqBy(items, i => `${i?.aweme_id}`)) {
			const row = await this.socialPostService.fromTikTokSearch(item);
			if (row) rows.push(row);
		}
		return { found: items.length, rows };
	}

	private async collect(
		items: any[],
		map: (row: any) => Promise<PostFields | null>,
		since: string,
	): Promise<PostFields[]> {
		const rows: PostFields[] = [];
		for (const item of _.uniqBy(items, i => `${i?.id}`)) {
			if (item?.createTimeISO && item.createTimeISO < since) continue;
			const row = await map(item);
			if (row) rows.push(row);
		}
		return rows;
	}

	private async saveAll(rows: PostFields[], city: City): Promise<number> {
		let saved = 0;
		for (const row of _.uniqBy(rows, r => r.externalId)) {
			if (await this.socialPostService.upsert(row, city)) saved++;
			if (saved % 200 === 0) await this.em.flush();
		}
		await this.em.flush();
		this.logger.log(`Saved ${saved} posts`);
		return saved;
	}
}

/** Whether a TikTok URL is the video with this id (an item without a URL is taken as the post's). */
const isSameVideo = (url: unknown, videoId: string): boolean =>
	typeof url !== 'string' || url.split('?')[0].endsWith(`/video/${videoId}`);
