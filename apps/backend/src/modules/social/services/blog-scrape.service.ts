import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger } from '@nestjs/common';

import type { City } from 'src/modules/cities/entities/city.entity.js';
import { CitySource, CitySourceKindEnum } from 'src/modules/cities/entities/city-source.entity.js';
import { CityService } from 'src/modules/cities/services/city.service.js';
import { sourcePlatform } from 'src/modules/cities/util/city-source.js';

import {
	BLOG_BACKFILL_MONTHS,
	BLOG_FEED_MAX_PAGES,
	BLOG_MAX_ARTICLE_FETCHES,
	BLOG_MAX_TEXT_CHARS,
	BLOG_MIN_FEED_WORDS,
} from '../constants/blog.constant.js';
import { PostSourceKindEnum } from '../entities/post-source.entity.js';
import { SocialPost } from '../entities/social-post.entity.js';
import {
	articleText,
	blogExternalId,
	blogHandle,
	canonicalArticleUrl,
	feedLinksOf,
	feedPathCandidates,
	FeedItem,
	htmlToText,
	pagedFeedUrl,
	ParsedFeed,
	parseFeed,
	wordCount,
} from '../util/blog-feed.js';

import { BlogFetchService } from './blog-fetch.service.js';
import { SocialPostService } from './social-post.service.js';

/** What one blog gave a run. */
export interface BlogScrapeEntry {
	source: string;
	feedUrl: string | null;
	/** Feed pages read */
	pages: number;
	/** Articles the pages listed */
	listed: number;
	/** Articles stored as posts this run */
	saved: number;
	/** Of those, articles whose feed had an excerpt only, read from their page */
	fromPages: number;
	/** Articles left for the next run: the page fetches ran out */
	waiting: number;
	error: string | null;
}

export interface BlogScrapeResult {
	blogs: number;
	saved: number;
	failed: number;
	details: BlogScrapeEntry[];
}

const NO_FEED = 'No RSS or Atom feed found';
const DAY_MS = 24 * 3600 * 1000;

/**
 * Reads a city's enabled blog sources through their feeds and stores each new article as a
 * `SocialPost` (platform `blog`, the blog its account), for `EXTRACT_MENTIONS` to read like any
 * post. Free: plain fetches, one blog at a time.
 */
@Injectable()
export class BlogScrapeService {
	private readonly logger = new Logger(BlogScrapeService.name);

	constructor(
		private readonly em: EntityManager,
		private readonly cityService: CityService,
		private readonly socialPostService: SocialPostService,
		private readonly blogFetchService: BlogFetchService,
	) {}

	/**
	 * Every enabled blog of the city: its articles published in the last `BLOG_BACKFILL_MONTHS`
	 * that are not stored yet, the feed paged back (`?paged=N`) while a page still lists such
	 * articles. An excerpt-only item's text comes from its page. Flushes after each blog.
	 */
	async scrapeCity(city: City, now = new Date()): Promise<BlogScrapeResult> {
		const sources = await this.cityService.sources(city.id, { kind: CitySourceKindEnum.BLOG, enabledOnly: true });
		const since = new Date(now);
		since.setUTCMonth(since.getUTCMonth() - BLOG_BACKFILL_MONTHS);
		const details: BlogScrapeEntry[] = [];
		for (const source of sources) {
			const entry = await this.scrapeBlog(city, source, since, now);
			this.cityService.recordBlogCheck(source, { feedUrl: entry.feedUrl, error: entry.error }, now);
			await this.em.flush();
			if (entry.error) this.logger.warn(`Blog ${source.value}: ${entry.error}`);
			details.push(entry);
		}
		if (details.length) await this.socialPostService.finishSave(city.id);
		return {
			blogs: details.length,
			saved: details.reduce((sum, d) => sum + d.saved, 0),
			failed: details.filter(d => d.error).length,
			details,
		};
	}

	private async scrapeBlog(city: City, source: CitySource, since: Date, now: Date): Promise<BlogScrapeEntry> {
		const entry: BlogScrapeEntry = {
			source: source.value,
			feedUrl: null,
			pages: 0,
			listed: 0,
			saved: 0,
			fromPages: 0,
			waiting: 0,
			error: null,
		};
		// The stored feed first; looked for again when it no longer answers
		let found = source.feedUrl ? await this.readFeed(source.feedUrl) : null;
		found ??= await this.findFeed(source.value);
		if (!found) return { ...entry, error: NO_FEED };
		entry.feedUrl = found.url;

		const latest = new Date(now.getTime() + DAY_MS);
		const toSave: FeedItem[] = [];
		const seen = new Set<string>();
		let feed: ParsedFeed | null = found.feed;
		for (let page = 1; feed && page <= BLOG_FEED_MAX_PAGES; page++) {
			entry.pages++;
			// A feed without paging answers its first page again: nothing new on it ends the paging
			const fresh = feed.items.filter(item => !seen.has(canonicalArticleUrl(item.url)));
			if (!fresh.length) break;
			for (const item of fresh) seen.add(canonicalArticleUrl(item.url));
			entry.listed += fresh.length;
			const known = await this.storedIds(fresh.map(item => blogExternalId(item.url)));
			const wanted = fresh.filter(
				item =>
					item.publishedAt &&
					item.publishedAt >= since &&
					item.publishedAt <= latest &&
					!known.has(blogExternalId(item.url)),
			);
			toSave.push(...wanted);
			const dates = fresh.map(item => item.publishedAt?.getTime()).filter((t): t is number => t !== undefined);
			// Older pages only while this one still had articles to read and reaches into the window
			if (!wanted.length || !dates.length || Math.min(...dates) < since.getTime()) break;
			feed = page < BLOG_FEED_MAX_PAGES ? await this.readFeed(pagedFeedUrl(found.url, page + 1)).then(r => r?.feed ?? null) : null;
		}

		const handle = blogHandle(source.value);
		const platform = sourcePlatform(CitySourceKindEnum.BLOG);
		let fetches = 0;
		for (const item of toSave) {
			let text = htmlToText(item.html);
			if (wordCount(text) < BLOG_MIN_FEED_WORDS) {
				if (fetches >= BLOG_MAX_ARTICLE_FETCHES) {
					entry.waiting++;
					continue;
				}
				fetches++;
				const page = await this.blogFetchService.get(item.url, 'page');
				const pageText = page ? articleText(page.body) : '';
				if (wordCount(pageText) > wordCount(text)) {
					text = pageText;
					entry.fromPages++;
				}
			}
			if (!text && !item.title) continue;
			await this.socialPostService.upsert(
				{
					externalId: blogExternalId(item.url),
					platform,
					url: canonicalArticleUrl(item.url),
					postedAt: item.publishedAt!,
					// Named by its site: a feed's title names a section ("Essen + Trinken Archives - Qiez")
					author: handle,
					finds: [{ kind: PostSourceKindEnum.BLOG, value: source.value }],
					text: [item.title, text].filter(Boolean).join('\n\n').slice(0, BLOG_MAX_TEXT_CHARS),
				},
				city,
			);
			entry.saved++;
		}
		return entry;
	}

	/** The feed at `url`, or null when it does not answer or is no feed. */
	private async readFeed(url: string): Promise<{ url: string; feed: ParsedFeed } | null> {
		const res = await this.blogFetchService.get(url, 'feed');
		const feed = res && parseFeed(res.body, res.url);
		return feed ? { url, feed } : null;
	}

	/**
	 * A source's feed: the URL itself when it is one, else the first feed its page announces,
	 * else the first usual feed path under it (`feedPathCandidates`) that answers with a feed.
	 */
	private async findFeed(sourceUrl: string): Promise<{ url: string; feed: ParsedFeed } | null> {
		const res = await this.blogFetchService.get(sourceUrl, 'feed');
		if (res) {
			const feed = parseFeed(res.body, res.url);
			if (feed) return { url: sourceUrl, feed };
			for (const link of feedLinksOf(res.body, res.url)) {
				const found = await this.readFeed(link);
				if (found) return found;
			}
		}
		for (const candidate of feedPathCandidates(sourceUrl)) {
			const found = await this.readFeed(candidate);
			if (found) return found;
		}
		return null;
	}

	private async storedIds(externalIds: string[]): Promise<Set<string>> {
		if (!externalIds.length) return new Set();
		const posts = await this.em.find(SocialPost, { externalId: { $in: externalIds } }, { fields: ['externalId'] });
		return new Set(posts.map(p => p.externalId));
	}
}
