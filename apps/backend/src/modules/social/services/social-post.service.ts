import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';

import type { City } from 'src/modules/cities/entities/city.entity.js';

import { SocialPlatformEnum, SocialPost } from '../entities/social-post.entity.js';
import { hashtagOfTagUrl } from '../util/instagram-tags.js';

import { SocialAccountService } from './social-account.service.js';

type SubtitleLink = { language: string; downloadLink: string; source?: string };

export type PostFields = Omit<
	Partial<SocialPost>,
	'id' | 'mentions' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'city' | 'account'
> &
	Pick<SocialPost, 'externalId' | 'platform' | 'url' | 'postedAt'> & {
		/** The name the author's profile shows, when the item carries it: the account's `displayName` */
		authorName?: string | null;
	};

/**
 * Stores posts from the scrapers' four item shapes. Subtitle links expire within days, so
 * subtitles are downloaded while saving, right after a scrape.
 */
@Injectable()
export class SocialPostService {
	private readonly logger = new Logger(SocialPostService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly socialAccountService: SocialAccountService,
	) {}

	/**
	 * Creates the post in the city whose scrape found it, or refreshes its counts (a known post
	 * keeps its first city), and links it to its author's account (`SocialAccountService.ensure`,
	 * which takes the item's display name and follower count). Returns false for an item it
	 * cannot use. Does not flush.
	 */
	async upsert(fields: PostFields, city: City): Promise<boolean> {
		const { authorName, ...postFields } = fields;
		const account = await this.socialAccountService.ensure(fields.platform, fields.author, city, {
			displayName: authorName,
			followers: fields.authorFans,
		});
		const existing = await this.em.findOne(SocialPost, { externalId: fields.externalId });
		if (existing) {
			// Counts move, the rest stays as first seen; subtitles only fill a gap
			Object.assign(existing, _.pick(postFields, ['views', 'likes', 'shares', 'comments', 'saves', 'authorFans']));
			existing.subtitles ??= fields.subtitles ?? null;
			existing.subtitlesLanguage ??= fields.subtitlesLanguage ?? null;
			existing.account ??= account;
			return true;
		}
		this.em.create(SocialPost, { ...postFields, author: account?.handle ?? fields.author ?? null, account, city });
		return true;
	}

	/** One item of `clockworks/tiktok-scraper` (hashtags) or `clockworks/tiktok-hashtag-scraper`. */
	async fromClockworks(row: any): Promise<PostFields | null> {
		if (!row?.id || !row.webVideoUrl || !row.createTimeISO || row.error) return null;
		const subs = row.videoMeta?.subtitleLinks?.length ? await this.downloadSubtitles(row.videoMeta.subtitleLinks) : null;
		const hashtag = row.searchHashtag;
		return {
			externalId: `${row.id}`,
			platform: SocialPlatformEnum.TIKTOK,
			url: row.webVideoUrl,
			postedAt: new Date(row.createTimeISO),
			author: row.authorMeta?.name ?? null,
			authorName: row.authorMeta?.nickName ?? null,
			authorFans: row.authorMeta?.fans ?? null,
			views: row.playCount ?? 0,
			likes: row.diggCount ?? 0,
			shares: row.shareCount ?? 0,
			comments: row.commentCount ?? 0,
			saves: row.collectCount ?? 0,
			isAd: !!(row.isAd || row.isSponsored),
			locationName: row.locationMeta?.locationName ?? null,
			source:
				hashtag ? `#${typeof hashtag === 'object' ? hashtag.name : hashtag}`
				: row.searchQuery ? `search:${row.searchQuery}`
				: null,
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
		const keyword = row.__search_terms?.keyword;
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
			source: keyword ? `search:${keyword}` : null,
			text,
			hashtags: _.uniq(tags.length ? tags : (text.match(/#[\p{L}\p{N}_]+/gu) ?? []).map(h => h.slice(1))),
			taggedHandles: _.uniq((text.match(/@[\w.]+/g) ?? []).map(h => h.slice(1))),
			subtitles: subs?.subtitles ?? null,
			subtitlesLanguage: subs?.language ?? null,
		};
	}

	/** One item of `scraping_solutions/instagram-location-posts-local-creator-finder`. */
	fromInstagramLocation(row: any, venueName: string): PostFields | null {
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
			source: `place:${venueName}`,
			text: caption,
			hashtags: (caption.match(/#[\p{L}\p{N}_]+/gu) ?? []).map(h => h.slice(1)),
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
		const count = (n: unknown) => (typeof n === 'number' && n > 0 ? n : 0);
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
			views: count(row.videoPlayCount ?? row.videoViewCount),
			likes: count(row.likesCount),
			shares: count(row.sharesCount),
			comments: count(row.commentsCount),
			isAd: !!(row.paidPartnership || row.isSponsored),
			locationName: typeof row.locationName === 'string' && row.locationName.trim() ? row.locationName.trim() : null,
			source: `#${hashtag}`,
			text: caption,
			hashtags: _.uniq((caption.match(/#[\p{L}\p{N}_]+/gu) ?? []).map(h => h.slice(1))),
			// Caption @-mentions, co-authors and people tagged in the photo
			taggedHandles: _.uniq([
				...(caption.match(/@[\w.]+/g) ?? []).map(h => h.slice(1)),
				...usernames(row.coauthorProducers),
				...usernames(row.taggedUsers),
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
