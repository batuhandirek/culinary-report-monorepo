import { Injectable, Logger } from '@nestjs/common';

import { fetchPublic } from 'src/shared/util/public-fetch.js';

import {
	BLOG_FEED_USER_AGENT,
	BLOG_MAX_FEED_BYTES,
	BLOG_MAX_PAGE_BYTES,
	BLOG_REQUEST_PAUSE_MS,
} from '../constants/blog.constant.js';
import { isFeed } from '../util/blog-feed.js';

/** A fetched feed or page as text. */
export interface FetchedText {
	/** The URL that answered, after redirects */
	url: string;
	body: string;
}

const ACCEPT = {
	feed: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, text/html;q=0.8, */*;q=0.5',
	page: 'text/html, application/xhtml+xml;q=0.9, */*;q=0.5',
};

/**
 * Plain GETs of blogs for `BlogScrapeService`, which is its only caller; tests mock it. Each
 * request waits `BLOG_REQUEST_PAUSE_MS` first; the rules (public hosts, size caps, timeout) are
 * `fetchPublic`'s. A feed is asked for as a browser, then, when that brings no feed, as a feed
 * reader (`BLOG_FEED_USER_AGENT`). A failure of any kind is null: a blog that does not answer is
 * the run's note, never its failure.
 */
@Injectable()
export class BlogFetchService {
	private readonly logger = new Logger(BlogFetchService.name);

	async get(url: string, kind: 'feed' | 'page'): Promise<FetchedText | null> {
		const res = await this.fetch(url, kind);
		if (kind === 'page' || (res && isFeed(res.body))) return res;
		// A challenge, a 403 or a page: a feed reader may be let through to the feed
		const asReader = await this.fetch(url, kind, BLOG_FEED_USER_AGENT);
		return asReader && isFeed(asReader.body) ? asReader : res;
	}

	private async fetch(url: string, kind: 'feed' | 'page', userAgent?: string): Promise<FetchedText | null> {
		await new Promise(resolve => setTimeout(resolve, BLOG_REQUEST_PAUSE_MS));
		try {
			const res = await fetchPublic(url, {
				maxBytes: kind === 'feed' ? BLOG_MAX_FEED_BYTES : BLOG_MAX_PAGE_BYTES,
				truncate: kind === 'page',
				accept: ACCEPT[kind],
				...(userAgent && { userAgent }),
			});
			return res && { url: res.url, body: decode(res.body, res.contentType) };
		} catch (e) {
			this.logger.debug(`GET ${url} failed: ${(e as Error).message}`);
			return null;
		}
	}
}

/** The body in the charset its header or XML declaration names, else UTF-8. */
const decode = (body: Buffer, contentType: string | null): string => {
	const declared =
		contentType?.match(/charset=["']?([\w-]+)/i)?.[1] ??
		body.subarray(0, 200).toString('latin1').match(/<\?xml[^>]*encoding=["']([\w-]+)/i)?.[1];
	try {
		return new TextDecoder(declared ?? 'utf-8').decode(body);
	} catch {
		return new TextDecoder('utf-8').decode(body);
	}
};
