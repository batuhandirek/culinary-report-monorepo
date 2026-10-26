import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import type { City } from 'src/modules/cities/entities/city.entity.js';

import { PostHashtag } from '../entities/post-hashtag.entity.js';
import { PostSource, PostSourceKindEnum } from '../entities/post-source.entity.js';
import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
import { SocialPostSnapshot } from '../entities/social-post-snapshot.entity.js';
import { captionHashtags, ensureHashtags, normalizeHashtag } from '../util/hashtags.js';
import { hashtagOfTagUrl } from '../util/instagram-tags.js';
import { clockworksCounts, COUNT_FIELDS, countsOf, instagramCounts, isFinalAge, type PostCounts } from '../util/post-counts.js';
import { linkPostSources, type PostFind } from '../util/post-sources.js';

import { HashtagService } from './hashtag.service.js';
import { SocialAccountService } from './social-account.service.js';

type SubtitleLink = { language: string; downloadLink: string; source?: string };

export type PostFields = Omit<
	Partial<SocialPost>,
	| 'id'
	| 'mentions'
	| 'hashtagLinks'
	| 'foundBy'
	| 'createdAt'
	| 'updatedAt'
	| 'deletedAt'
	| 'city'
	| 'account'
> &
	Pick<SocialPost, 'externalId' | 'platform' | 'url' | 'postedAt'> & {
		/** The name the author's profile shows, when the item carries it: the account's `displayName` */
		authorName?: string | null;
		/** The caption's hashtags, in its order (`PostHashtag`) */
		hashtags?: string[];
		/** What found it in this scrape (`PostSource`); rows of one post merged keep them all */
		finds?: PostFind[];
	};

/** What found a `clockworks/tiktok-scraper` item: the hashtag or the query it came from. */
export const clockworksFinds = (row: any): PostFind[] => {
	const hashtag = row?.searchHashtag;
	const tag = normalizeHashtag(typeof hashtag === 'object' ? hashtag?.name : hashtag);
	return (
		tag ? [{ kind: PostSourceKindEnum.TIKTOK_HASHTAG, value: tag }]
		: row?.searchQuery ? [{ kind: PostSourceKindEnum.TIKTOK_SEARCH, value: `${row.searchQuery}` }]
		: []
	);
};

/** What found a `novi/advanced-search-tiktok-api` item: the query (`__search_terms.keyword`). */
export const tikTokSearchFinds = (row: any): PostFind[] => {
	const keyword = row?.__search_terms?.keyword;
	return keyword ? [{ kind: PostSourceKindEnum.TIKTOK_SEARCH, value: `${keyword}` }] : [];
};

/** Rows of one post (two queries or tags found it) as one, keeping every find. */
export const mergeFinds = (rows: PostFields[]): PostFields[] =>
	Object.values(_.groupBy(rows, r => r.externalId)).map(([first, ...rest]) => ({
		...first,
		finds: _.uniqBy(
			[first, ...rest].flatMap(r => r.finds ?? []),
			f => `${f.kind} ${f.value}`,
		),
	}));

/**
 * Stores posts from the scrapers' item shapes (hashtags, searches, places, profiles). Subtitle links expire within days, so
 * subtitles are downloaded while saving, right after a scrape.
 */
@Injectable()
export class SocialPostService {
	private readonly logger = new Logger(SocialPostService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly socialAccountService: SocialAccountService,
		private readonly hashtagService: HashtagService,
	) {}

	/**
	 * After a scrape's posts are flushed: their finds point at the city's sources they are, and
	 * new tags get their food topic and brand.
	 */
	async finishSave(cityId: string): Promise<void> {
		await linkPostSources(this.em, cityId);
		await this.hashtagService.relink();
	}

	/**
	 * Creates the post in the city whose scrape found it, or reads its counts again (a known post
	 * keeps its first city and caption; `readCounts`), and links it to its author's account
	 * (`SocialAccountService.ensure`, which takes the item's display name and follower count).
	 * Every find is recorded (`PostSource`), new post or known; a new post's hashtags are stored
	 * as rows (`PostHashtag`); `seenAt` dates the author's follower snapshot. Returns false for an
	 * item it cannot use. Does not flush; the finds
	 * reach their city source with `linkPostSources` after the flush.
	 */
	async upsert(fields: PostFields, city: City, seenAt = new Date()): Promise<boolean> {
		const { authorName, hashtags, finds, ...postFields } = fields;
		const account = await this.socialAccountService.ensure(
			fields.platform,
			fields.author,
			city,
			{ displayName: authorName, followers: fields.authorFans },
			seenAt,
		);
		const existing = await this.em.findOne(SocialPost, { externalId: fields.externalId });
		if (existing) {
			// Counts move until final, the author's followers always; the rest stays as first
			// seen, subtitles only fill a gap
			Object.assign(existing, _.pick(postFields, ['authorFans']));
			this.readCounts(existing, postFields, seenAt);
			existing.subtitles ??= fields.subtitles ?? null;
			existing.subtitlesLanguage ??= fields.subtitlesLanguage ?? null;
			existing.account ??= account;
			await this.addFinds(existing, finds ?? []);
			return true;
		}
		const post = this.em.create(SocialPost, {
			...postFields,
			author: account?.handle ?? fields.author ?? null,
			account,
			city,
		});
		this.readCounts(post, postFields, seenAt);
		const tagIds = await ensureHashtags(this.em, hashtags ?? []);
		_.uniq((hashtags ?? []).map(normalizeHashtag).filter(Boolean)).forEach((tag, rank) =>
			this.em.create(PostHashtag, { post, hashtag: tagIds.get(tag)!, rank }),
		);
		const now = new Date();
		for (const find of _.uniqBy(finds ?? [], f => `${f.kind} ${f.value}`))
			this.em.create(PostSource, { post, kind: find.kind, value: find.value, venue: find.venueId ?? null, foundAt: now });
		return true;
	}

	/** A known post's finds this time: a row for each source not on it yet. */
	private async addFinds(post: SocialPost, finds: PostFind[]): Promise<void> {
		if (!finds.length) return;
		const known = new Set(
			(await this.em.find(PostSource, { post })).map(f => `${f.kind} ${f.value}`),
		);
		const now = new Date();
		for (const find of _.uniqBy(finds, f => `${f.kind} ${f.value}`))
			if (!known.has(`${find.kind} ${find.value}`))
				this.em.create(PostSource, { post, kind: find.kind, value: find.value, venue: find.venueId ?? null, foundAt: now });
	}

	/**
	 * Records one read of a post's counts (a scrape that found it, or the refresh): always a
	 * snapshot; the post's own counts only while they aren't final, and they become final when the
	 * read is at `POST_COUNTS_AGE_DAYS` or later, so every post is compared at the same age. A
	 * count the read doesn't carry keeps the post's. Blog articles have no counts. Does not flush.
	 */
	readCounts(post: SocialPost, fields: Partial<PostCounts>, at = new Date()): void {
		if (post.platform === SocialPlatformEnum.BLOG) return;
		const read = _.pick(fields, COUNT_FIELDS);
		this.em.create(SocialPostSnapshot, { post, at, ...countsOf({ ...countsOf(post), ...read }) });
		if (post.countsFinalAt) return;
		Object.assign(post, read);
		post.countsAt = at;
		if (isFinalAge(post.postedAt, at)) post.countsFinalAt = at;
	}

	/**
	 * The refresh found the post deleted or private: its counts stay as last read, final, so it
	 * is never paid for again. Does not flush.
	 */
	closeCounts(post: SocialPost, at = new Date()): void {
		post.countsFinalAt ??= at;
	}

	/** One item of `clockworks/tiktok-scraper` (hashtags) or `clockworks/tiktok-hashtag-scraper`. */
	async fromClockworks(row: any): Promise<PostFields | null> {
		if (!row?.id || !row.webVideoUrl || !row.createTimeISO || row.error) return null;
		const subs = row.videoMeta?.subtitleLinks?.length ? await this.downloadSubtitles(row.videoMeta.subtitleLinks) : null;
		return {
			externalId: `${row.id}`,
			platform: SocialPlatformEnum.TIKTOK,
			url: row.webVideoUrl,
			postedAt: new Date(row.createTimeISO),
			author: row.authorMeta?.name ?? null,
			authorName: row.authorMeta?.nickName ?? null,
			authorFans: row.authorMeta?.fans ?? null,
			...clockworksCounts(row),
			isAd: !!(row.isAd || row.isSponsored),
			locationName: row.locationMeta?.locationName ?? null,
			finds: clockworksFinds(row),
			text: row.text ?? null,
			hashtags: _.uniq((row.hashtags ?? []).map((h: any) => h?.name).filter(Boolean)),
			taggedHandles: row.mentions ?? [],
			subtitles: subs?.subtitles ?? null,
			subtitlesLanguage: subs?.language ?? null,
		};
	}

	/**
	 * One item of `novi/advanced-search-tiktok-api`: TikTok's own video object, with the query in
	 * `__search_terms.keyword` (`includeSearchTerms`). Subtitle links are in the video's
	 * `cla_info.caption_infos`, the tagged place in an `anchor_poi` anchor.
	 */
	async fromTikTokSearch(row: any): Promise<PostFields | null> {
		const handle = row?.author?.unique_id;
		if (!row?.aweme_id || !handle || !row.create_time) return null;
		const links: SubtitleLink[] = (row.video?.cla_info?.caption_infos ?? [])
			.filter((c: any) => c?.url)
			.map((c: any) => ({
				language: c.lang,
				downloadLink: c.url,
				source: c.is_original_caption ? 'ORIGINAL' : 'MT',
			}));
		const subs = links.length ? await this.downloadSubtitles(links) : null;
		const stats = row.statistics ?? {};
		const text: string = row.desc ?? '';
		const tags: string[] = (row.text_extra ?? []).map((t: any) => t?.hashtag_name).filter(Boolean);
		const place = (row.anchors ?? []).find((a: any) => a?.component_key === 'anchor_poi');
		return {
			externalId: `${row.aweme_id}`,
			platform: SocialPlatformEnum.TIKTOK,
			url: `https://www.tiktok.com/@${handle}/video/${row.aweme_id}`,
			postedAt: new Date(row.create_time * 1000),
			author: handle,
			authorName: row.author.nickname ?? null,
			authorFans: row.author.follower_count ?? null,
			views: stats.play_count ?? 0,
			likes: stats.digg_count ?? 0,
			shares: stats.share_count ?? 0,
			comments: stats.comment_count ?? 0,
			saves: stats.collect_count ?? 0,
			// Branded content carries TikTok's "ad" label
			isAd: !!(row.is_ads || row.commerce_info?.branded_content_type),
			locationName: row.poi_info?.poi_name ?? place?.keyword ?? null,
			finds: tikTokSearchFinds(row),
			text,
			hashtags: _.uniq(tags.length ? tags : captionHashtags(text)),
			taggedHandles: _.uniq((text.match(/@[\w.]+/g) ?? []).map(h => h.slice(1))),
			subtitles: subs?.subtitles ?? null,
			subtitlesLanguage: subs?.language ?? null,
		};
	}

	/** One item of `scraping_solutions/instagram-location-posts-local-creator-finder`, run for a venue's place. */
	fromInstagramLocation(row: any, venue: { id: string; name: string }): PostFields | null {
		if (!row?.postId || !row.postUrl || !row.publishedAt) return null;
		const caption: string = row.caption ?? '';
		return {
			externalId: `ig_${row.postId}`,
			platform: SocialPlatformEnum.INSTAGRAM,
			url: row.postUrl,
			postedAt: new Date(row.publishedAt),
			author: row.username ?? null,
			authorName: row.fullName ?? null,
			// The actor does not return follower counts
			authorFans: null,
			views: row.playCount ?? 0,
			likes: row.likeCount ?? 0,
			shares: row.shareCount ?? 0,
			comments: row.commentCount ?? 0,
			locationName: row.locationName ?? null,
			finds: [{ kind: PostSourceKindEnum.VENUE_PLACE, value: venue.name, venueId: venue.id }],
			text: caption,
			hashtags: captionHashtags(caption),
			taggedHandles: (caption.match(/@[\w.]+/g) ?? []).map(h => h.slice(1)),
		};
	}

	/**
	 * One item of `apify/instagram-scraper` run on tag URLs (`resultsType` posts or reels): its
	 * `inputUrl` names the hashtag. Hidden like counts come back as -1, a tag with nothing to show
	 * as an item with `error` only. Items carry no follower count.
	 */
	fromInstagramHashtag(row: any): PostFields | null {
		const hashtag = hashtagOfTagUrl(row?.inputUrl);
		if (!row?.id || !row.url || !row.timestamp || !hashtag) return null;
		const caption: string = row.caption ?? '';
		const usernames = (list: unknown) =>
			Array.isArray(list) ? list.map((u: any) => u?.username).filter(Boolean) : [];
		return {
			// The media pk, as the location actor's `postId`, so both actors' copies are one post
			externalId: `ig_${`${row.id}`.split('_')[0]}`,
			platform: SocialPlatformEnum.INSTAGRAM,
			url: row.url,
			postedAt: new Date(row.timestamp),
			author: row.ownerUsername ?? null,
			authorName: row.ownerFullName ?? null,
			authorFans: null,
			...instagramCounts(row),
			isAd: !!(row.paidPartnership || row.isSponsored),
			locationName: typeof row.locationName === 'string' && row.locationName.trim() ? row.locationName.trim() : null,
			finds: [{ kind: PostSourceKindEnum.INSTAGRAM_HASHTAG, value: normalizeHashtag(hashtag) }],
			text: caption,
			hashtags: captionHashtags(caption),
			// Caption @-mentions, co-authors and people tagged in the photo
			taggedHandles: _.uniq([
				...(caption.match(/@[\w.]+/g) ?? []).map(h => h.slice(1)),
				...usernames(row.coauthorProducers),
				...usernames(row.taggedUsers),
			]),
		};
	}

	/**
	 * One of the `latestPosts` of an `apify/instagram-profile-scraper` item (`profile`, the
	 * account's): the same media fields as the hashtag actor's items (`id` is the media pk), views
	 * on videos only, hidden like counts as -1. The profile carries the author's followers.
	 */
	fromInstagramProfilePost(post: any, profile: any): PostFields | null {
		if (!post?.id || !post.url || !post.timestamp) return null;
		const caption: string = post.caption ?? '';
		const usernames = (list: unknown) =>
			Array.isArray(list) ? list.map((u: any) => u?.username).filter(Boolean) : [];
		const author = post.ownerUsername ?? profile?.username ?? null;
		return {
			externalId: `ig_${`${post.id}`.split('_')[0]}`,
			platform: SocialPlatformEnum.INSTAGRAM,
			url: post.url,
			postedAt: new Date(post.timestamp),
			author,
			authorName: profile?.fullName ?? null,
			authorFans: typeof profile?.followersCount === 'number' ? profile.followersCount : null,
			...instagramCounts(post),
			isAd: !!(post.paidPartnership || post.isSponsored),
			locationName: typeof post.locationName === 'string' && post.locationName.trim() ? post.locationName.trim() : null,
			text: caption,
			hashtags: captionHashtags(caption),
			taggedHandles: _.uniq([
				...(caption.match(/@[\w.]+/g) ?? []).map(h => h.slice(1)),
				...usernames(post.coauthorProducers),
				...usernames(post.taggedUsers),
			]),
		};
	}

	private async downloadSubtitles(
		links: SubtitleLink[],
	): Promise<{ language: string; subtitles: string } | null> {
		// Machine translations (source "MT") garble venue names; the original language is better
		const link =
			links.find(l => l.source !== 'MT') ?? links.find(l => l.language === 'eng-US') ?? links[0];
		if (!link?.downloadLink) return null;
		try {
			const res = await fetch(link.downloadLink, { signal: AbortSignal.timeout(15_000) });
			if (!res.ok) return null;
			const body = await res.text();
			if (body.trimStart().startsWith('{')) {
				const json = JSON.parse(body);
				if (!json.utterances) return null;
				return {
					language: link.language,
					subtitles: json.utterances.map((u: { text: string }) => u.text).join('\n'),
				};
			}
			const subtitles = body
				.replaceAll(/\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}\n/g, '')
				.replaceAll('WEBVTT', '')
				.replaceAll(/\n\s*\n/g, '\n')
				.trim();
			return { language: link.language, subtitles };
		} catch (e) {
			this.logger.debug(`Subtitle download failed: ${(e as Error).message}`);
			return null;
		}
	}
}
