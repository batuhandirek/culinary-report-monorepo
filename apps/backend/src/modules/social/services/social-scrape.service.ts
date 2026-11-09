import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import type { ActorCall } from 'src/modules/apify/actors/actor.js';
import {
	INSTAGRAM_LOCATION_ACTOR,
	type InstagramLocationInput,
	type InstagramLocationItem,
} from 'src/modules/apify/actors/instagram-location.actor.js';
import type { InstagramScraperItem } from 'src/modules/apify/actors/instagram-scraper.actor.js';
import {
	TIKTOK_COMMENTS_ACTOR,
	type TiktokCommentItem,
	type TiktokCommentsInput,
} from 'src/modules/apify/actors/tiktok-comments.actor.js';
import type { TiktokSearchItem } from 'src/modules/apify/actors/tiktok-search.actor.js';
import { ApifyService } from 'src/modules/apify/services/apify.service.js';
import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CitySourceKindEnum } from 'src/modules/cities/entities/city-source.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import {
	type InstagramHashtagKind,
	type InstagramHashtagsCall,
	perHashtagWithin,
} from 'src/modules/pipeline/atoms/instagram-hashtags/util/instagram-hashtags-input.js';
import {
	findsBy,
	type TikTokSearchWindow,
	type TiktokSearchCall,
} from 'src/modules/pipeline/atoms/tiktok-search/util/tiktok-search-input.js';
import { Venue } from 'src/modules/venues/entities/venue.entity.js';
import { venueSearchName } from 'src/modules/venues/util/brands.js';
import { isSameVenue, plain } from 'src/modules/venues/util/venue-names.js';

import { SocialPost } from '../entities/social-post.entity.js';
import { fromClockworksComment } from '../util/post-comments.js';

import { PostCommentService } from './post-comment.service.js';
import {
	mergeFinds,
	PostFields,
	SocialPostService,
	tikTokSearchFinds,
} from './social-post.service.js';

// Free-plan price per comment, to size a run inside its cap (Apify enforces the cap regardless)
const TIKTOK_COMMENT_USD = 0.00125;
// 1 GB is plenty for one post's comments, and four side by side leave room on the plan's 16 GB
const COMMENTS_RUN_MEMORY_MB = 1024;

/** The comments scrape as the `scrape-comments` workflow runs it: one run per post */
export interface CommentsPlan {
	posts: { id: string; externalId: string }[];
	/** One per post, in the posts' order */
	calls: ActorCall<TiktokCommentsInput, TiktokCommentItem>[];
	memoryMbytes: number;
}

/** The venues' Instagram place pages as the `scrape-venue-social` workflow runs them: one run */
export interface VenuePlacesPlan {
	/** The place name searched → the venue it was for */
	venues: Record<string, { id: string; name: string }>;
	call: ActorCall<InstagramLocationInput, InstagramLocationItem> | null;
}

export interface ScrapeResult {
	found: number;
	saved: number;
}

/** What one search's or hashtag run's window is given */
export interface CityScrapeOptions {
	/** Posts older than this (ISO) are left out */
	since: string;
	/** Results per query or hashtag asked for */
	perSource: number;
	budgetUsd: number;
}

/**
 * The city scrapes' plans and saves: the `tiktok-search` and `instagram-hashtags` atoms
 * (`pipeline/atoms/`) run the actors and save their items here, so a found video or post becomes
 * the city's post with the finds that found it (`PostSource`, linked to the city source it is);
 * the comments scrape and the venues' Instagram place pages are plans and saves for their
 * operations' own actor children (`planComments` / `saveComments`, `planVenuePlaces` /
 * `saveVenuePlaces`).
 */
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
	 * The comments under these TikTok posts, `perPost` top-level ones at most each: one run per
	 * post on its share of the budget, its limit sized to that share so Apify's cap never cuts it.
	 */
	planComments(posts: SocialPost[], perPost: number, budgetUsd: number): CommentsPlan {
		const capUsd = budgetUsd / Math.max(posts.length, 1);
		const limit = Math.max(1, Math.min(perPost, Math.floor(capUsd / TIKTOK_COMMENT_USD)));
		return {
			posts: posts.map(p => ({ id: p.id, externalId: p.externalId })),
			calls: posts.map(post => ({
				actor: TIKTOK_COMMENTS_ACTOR,
				input: {
					postURLs: [post.url],
					topLevelCommentsPerPost: limit,
					commentsPerPost: limit,
					maxRepliesPerComment: 0,
				},
				maxCostUsd: capUsd,
				purpose: `tiktok comments: ${post.externalId}`,
			})),
			memoryMbytes: COMMENTS_RUN_MEMORY_MB,
		};
	}

	/**
	 * Each run's items read from its row and stored as its post's comments, without their
	 * authors (`PostCommentService.save`); a post is marked scraped even when it returned nothing,
	 * so it is never paid for twice, one whose run failed (`null`) is not. Flushes.
	 */
	async saveComments(
		plan: CommentsPlan,
		recordIds: (string | null)[],
	): Promise<{ posts: number; found: number; saved: number; failed: number }> {
		const posts = await this.em.find(SocialPost, { id: { $in: plan.posts.map(p => p.id) } });
		const byId = new Map(posts.map(p => [p.id, p]));
		let found = 0;
		let saved = 0;
		let failed = 0;
		for (const [index, planned] of plan.posts.entries()) {
			const post = byId.get(planned.id);
			const recordId = recordIds[index];
			if (!post || !recordId) {
				failed++;
				continue;
			}
			const items = await this.apifyService.storedItems<TiktokCommentItem>(recordId);
			found += items.length;
			const rows = items
				// Only the post's own top-level comments
				.filter(
					item => !item?.repliesToId && isSameVideo(item?.videoWebUrl, post.externalId),
				)
				.map(fromClockworksComment)
				.filter(row => row !== null);
			saved += await this.postCommentService.save(post, rows);
		}
		await this.em.flush();
		return { posts: plan.posts.length, found, saved, failed };
	}

	/**
	 * The city-wide TikTok search as one `tiktok-search.run`: the city's enabled searches and
	 * hashtag words, all through TikTok's search in its region over `window`. A hashtag's own feed
	 * (clockworks) has no date filter and came back half older than three months at ~$0.004 an item,
	 * so its word is searched instead (~$0.0004 a result, as relevant: on Berlin's first weeks 54 %
	 * of each named a matched place); a find of a hashtag's word keeps the hashtag's kind, so the
	 * Sources tab's yield stays the source's. None without a source.
	 */
	async planCityTikTok(
		city: City,
		opts: CityScrapeOptions & { window: TikTokSearchWindow },
	): Promise<TiktokSearchCall | null> {
		const [hashtags, searches] = await Promise.all([
			this.cityService.enabledValues(city.id, CitySourceKindEnum.TIKTOK_HASHTAG),
			this.cityService.enabledValues(city.id, CitySourceKindEnum.TIKTOK_SEARCH),
		]);
		const queries = _.uniqBy([...searches, ...hashtags], q => q.toLowerCase());
		if (!queries.length) return null;
		const searchSet = new Set(searches.map(q => q.toLowerCase()));
		return {
			queries,
			window: opts.window,
			perQuery: opts.perSource,
			since: opts.since,
			// A word that is a search too is a search's find
			finds: {
				kind: 'city',
				hashtagWords: hashtags.filter(h => !searchSet.has(h.toLowerCase())),
			},
			maxCostUsd: opts.budgetUsd,
			purpose: `tiktok search ${city.name}: ${searches.length} queries, ${hashtags.length} hashtags`,
		};
	}

	/**
	 * TikTok searches by venue name (the brand's, with the city's name, in its region) as one
	 * `tiktok-search.run`: each find is a `venue_search` of the venue that carried the name. None
	 * without a venue.
	 */
	planVenueSearch(
		city: City,
		venues: Venue[],
		opts: CityScrapeOptions & { window: TikTokSearchWindow },
	): TiktokSearchCall | null {
		if (!venues.length) return null;
		const venueIds: Record<string, string> = {};
		// A branch is searched under its brand's name
		for (const venue of venues) venueIds[venueSearchQuery(venue, city.name)] ??= venue.id;
		return {
			queries: Object.keys(venueIds),
			window: opts.window,
			perQuery: opts.perSource,
			since: opts.since,
			finds: { kind: 'venue', venueIds },
			maxCostUsd: opts.budgetUsd,
			purpose: `tiktok venue search ${city.name}: ${venues.length} venues`,
		};
	}

	/**
	 * A search run's items saved as the city's posts: a video two queries found is downloaded
	 * once, with both finds (recorded by the run's rule, `findsBy`); videos before `since` are
	 * left out (the search's window is coarser). Flushes; the posts written.
	 */
	async saveTikTokSearch(
		city: City,
		items: TiktokSearchItem[],
		call: Pick<TiktokSearchCall, 'since' | 'finds'>,
	): Promise<number> {
		const rows: PostFields[] = [];
		for (const group of Object.values(_.groupBy(items, i => `${i?.aweme_id}`))) {
			const row = await this.socialPostService.fromTikTokSearch(group[0]);
			if (row && row.postedAt.toISOString() >= call.since)
				rows.push({
					...row,
					finds: findsBy(
						call.finds,
						_.uniqBy(group.flatMap(tikTokSearchFinds), f => f.value),
					),
				});
		}
		return this.saveAll(rows, city);
	}

	/**
	 * The city-wide Instagram scrape as `instagram-hashtags.run`s: the city's enabled Instagram
	 * hashtags, one run per kind over all of them: the tag feeds' posts and their top reels (the
	 * feed returns no reels). Reels get a quarter of the budget when both run, as tags have few.
	 * Each run's per-hashtag limit is sized to its share, so Apify's cap never stops it before the
	 * last hashtag; a share too small for one result a tag runs nothing. On the Free plan the posts
	 * run stops after each tag's first page: the daily `scrape-instagram.day` runs posts only.
	 * Nothing for a city with Instagram turned off (`skipped` says so).
	 */
	async planCityInstagram(
		city: City,
		opts: CityScrapeOptions & { kinds?: InstagramHashtagKind[] },
	): Promise<{ calls: InstagramHashtagsCall[]; skipped?: string }> {
		if (!city.instagramEnabled) return { calls: [], skipped: 'Instagram is off for the city' };
		const hashtags = await this.cityService.enabledValues(
			city.id,
			CitySourceKindEnum.INSTAGRAM_HASHTAG,
		);
		if (!hashtags.length) return { calls: [] };
		const kinds = opts.kinds ?? ['posts', 'reels'];
		const share = (kind: InstagramHashtagKind) =>
			kinds.length === 1 ? 1
			: kind === 'posts' ? 0.75
			: 0.25;
		return {
			calls: kinds.flatMap(kind => {
				const budgetUsd = opts.budgetUsd * share(kind);
				const perHashtag = perHashtagWithin(budgetUsd, hashtags.length, opts.perSource);
				if (perHashtag < 1) return [];
				return [
					{
						hashtags,
						kind,
						since: opts.since,
						perHashtag,
						maxCostUsd: budgetUsd,
						purpose: `instagram ${kind} ${city.name}: ${hashtags.length} hashtags`,
					},
				];
			}),
		};
	}

	/**
	 * A hashtag run's items saved as the city's posts, each a find of its tag (a post under two
	 * tags once, with both); posts before `since` are left out (pinned posts pass the actor's
	 * date filter). Flushes; the posts written.
	 */
	async saveInstagramHashtags(
		city: City,
		items: InstagramScraperItem[],
		call: Pick<InstagramHashtagsCall, 'since'>,
	): Promise<number> {
		const rows = items
			.map(item => this.socialPostService.fromInstagramHashtag(item))
			.filter((row): row is PostFields => !!row && row.postedAt.toISOString() >= call.since);
		return this.saveAll(rows, city);
	}

	/**
	 * The Instagram posts tagged at each venue's place: one run of the location actor for every
	 * venue's name with the city's. None without a venue.
	 */
	planVenuePlaces(city: City, venues: Venue[], opts: CityScrapeOptions): VenuePlacesPlan {
		const byQuery: Record<string, { id: string; name: string }> = {};
		for (const venue of venues)
			byQuery[venueSearchQuery(venue, city.name)] ??= { id: venue.id, name: venue.name };
		if (!venues.length) return { venues: byQuery, call: null };
		return {
			venues: byQuery,
			call: {
				actor: INSTAGRAM_LOCATION_ACTOR,
				input: {
					locations: Object.keys(byQuery),
					resultsPerLocation: opts.perSource,
					matchStrategy: 'best',
					maximumLocationsPerQuery: 1,
					onlyPostsNewerThan: opts.since.slice(0, 10),
					includeLocationInfo: true,
				},
				maxCostUsd: opts.budgetUsd,
				purpose: `instagram places: ${venues.length} venues`,
			},
		};
	}

	/**
	 * The run's items read from its row and saved as the city's posts, each a `venue_place` find
	 * of its venue. The actor's name search sometimes resolves to a namesake (another country,
	 * the city itself): every place is checked against the venue it was asked for. Flushes.
	 */
	async saveVenuePlaces(
		city: City,
		plan: VenuePlacesPlan,
		recordId: string | null,
		since: string,
	): Promise<ScrapeResult> {
		if (!recordId) return { found: 0, saved: 0 };
		const items = await this.apifyService.storedItems<InstagramLocationItem>(recordId);
		const rows = items
			.filter(row => {
				const venue = plan.venues[row.input ?? ''];
				return venue && row.locationName && isSameVenue(row.locationName, venue.name);
			})
			.map(row => this.socialPostService.fromInstagramLocation(row, plan.venues[row.input!]))
			.filter((row): row is PostFields => !!row && row.postedAt.toISOString() >= since);
		return { found: items.length, saved: await this.saveAll(rows, city) };
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
