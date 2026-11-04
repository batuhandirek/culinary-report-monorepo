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

import { PostSourceKindEnum } from '../entities/post-source.entity.js';
import type { SocialPost } from '../entities/social-post.entity.js';
import { instagramTagUrl } from '../util/instagram-tags.js';
import { fromClockworksComment } from '../util/post-comments.js';

import { PostCommentService } from './post-comment.service.js';
import { mergeFinds, PostFields, SocialPostService, tikTokSearchFinds } from './social-post.service.js';

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
// The search actor's smallest `limit`, and the smallest cap it accepts
const TIKTOK_SEARCH_MIN_LIMIT = 30;
const TIKTOK_SEARCH_MIN_CAP_USD = 4;

/** `novi/advanced-search-tiktok-api`'s `publishTime`: how far back a search looks. */
export type TikTokSearchWindow = 'WEEK' | 'MONTH' | 'THREE_MONTH';

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
	 * The city-wide TikTok scrape: the city's enabled searches and hashtag words, all through
	 * TikTok's search in its region over `searchWindow` (three months without), in one run. A
	 * hashtag's own feed (clockworks) has no date filter and came back half older than three months
	 * at ~$0.004 an item, so its word is searched instead (~$0.0004 a result, as relevant: on Berlin's
	 * first weeks 54 % of each named a matched place); a find of a hashtag's word keeps the hashtag's
	 * kind, so the Sources tab's yield stays the source's. Videos older than `since` stay out.
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
		const searchSet = new Set(searches.map(q => q.toLowerCase()));
		const hashtagSet = new Set(hashtags.map(h => h.toLowerCase()));
		const queries = _.uniqBy([...searches, ...hashtags], q => q.toLowerCase());
		const search = await this.searchTikTok(city, queries, {
			perQuery: opts.perSource,
			budgetUsd: Math.max(opts.budgetUsd, TIKTOK_SEARCH_MIN_CAP_USD),
			window: opts.searchWindow,
			label: `tiktok search ${city.name}: ${searches.length} queries, ${hashtags.length} hashtags`,
		});
		const rows = search.rows
			.filter(r => r.postedAt.toISOString() >= opts.since)
			.map(r => ({
				...r,
				finds: (r.finds ?? []).map(f => {
					const word = f.value.toLowerCase();
					return hashtagSet.has(word) && !searchSet.has(word) ? { ...f, kind: PostSourceKindEnum.TIKTOK_HASHTAG } : f;
				}),
			}));
		return { found: search.found, saved: await this.saveAll(rows, city) };
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
	 * tagged at the venue. The venues are the city's. With `tiktokOnly` (the weekly run) the
	 * whole budget goes to the search over `window`, and no Instagram place is read.
	 */
	async scrapeVenueSocial(opts: {
		city: City;
		venues: Venue[];
		since: string;
		perVenue: number;
		budgetUsd: number;
		tiktokOnly?: boolean;
		window?: TikTokSearchWindow;
	}): Promise<ScrapeResult> {
		const { city } = opts;
		if (!opts.venues.length) return { found: 0, saved: 0 };
		// The search actor refuses a cap under $4, hence the step's $8 default
		const half = opts.tiktokOnly ? opts.budgetUsd : opts.budgetUsd / 2;

		const byInput = new Map(opts.venues.map(v => [venueSearchQuery(v, city.name), v]));
		const search = await this.searchTikTok(
			city,
			// A branch is searched under its brand's name
			[...byInput.keys()],
			{
				perQuery: opts.perVenue,
				budgetUsd: half,
				window: opts.window,
				label: `tiktok venue search ${city.name}: ${opts.venues.length} venues`,
			},
		);
		// Found by a search for one venue, not by a city source
		const tiktok = search.rows
			.filter(r => r.postedAt.toISOString() >= opts.since)
			.map(r => ({
				...r,
				finds: (r.finds ?? []).map(f => ({
					kind: PostSourceKindEnum.VENUE_SEARCH,
					value: f.value,
					venueId: byInput.get(f.value)?.id,
				})),
			}));

		if (opts.tiktokOnly) return { found: search.found, saved: await this.saveAll(tiktok, city) };

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
			.map(row => this.socialPostService.fromInstagramLocation(row, byInput.get(row.input)!))
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
		// A video two queries found is downloaded once, with both finds
		for (const group of Object.values(_.groupBy(items, i => `${i?.aweme_id}`))) {
			const row = await this.socialPostService.fromTikTokSearch(group[0]);
			if (row) rows.push({ ...row, finds: _.uniqBy(group.flatMap(tikTokSearchFinds), f => f.value) });
		}
		return { found: items.length, rows };
	}

	private async saveAll(rows: PostFields[], city: City): Promise<number> {
		let saved = 0;
		// A post two of the run's sources found is saved once, with both finds
		for (const row of mergeFinds(rows)) {
			if (await this.socialPostService.upsert(row, city)) saved++;
			if (saved % 200 === 0) await this.em.flush();
		}
		await this.em.flush();
		await this.socialPostService.finishSave(city.id);
		this.logger.log(`Saved ${saved} posts`);
		return saved;
	}
}

/**
 * What a venue is searched for, on TikTok and Instagram places: its brand's name (`venueSearchName`)
 * up to a "|" or " - " tail, with the city's name unless it has it. A `venue_search` find's value.
 */
export const venueSearchQuery = (
	venue: { name: string; brand?: { name?: string } | null },
	cityName: string,
): string => {
	const head = venueSearchName(venue)
		.split(/\s[|\-–·•]\s|[|]/)[0]
		.trim();
	return plain(head).includes(plain(cityName)) ? head : `${head} ${cityName}`;
};

/** Whether a TikTok URL is the video with this id (an item without a URL is taken as the post's). */
const isSameVideo = (url: unknown, videoId: string): boolean =>
	typeof url !== 'string' || url.split('?')[0].endsWith(`/video/${videoId}`);
