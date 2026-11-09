import { defineActor } from './actor.js';

/**
 * `scrapewise/google-news-scraper`: Google News articles for queries, dated, filtered by date.
 *
 * - **Price.** $2.50 per 1,000 articles.
 * - **Rows.** Each item names its query (`searchQuery`, as given). A row with `errorCode`, or a
 *   type other than `article`, is no article.
 * - **URLs.** `resolveOriginalUrl` follows Google's redirect to the publisher's own address.
 */
export interface GoogleNewsInput {
	searchQueries: string[];
	language?: string;
	/** Uppercase ISO 3166-1 alpha-2, "DE" */
	countries?: string[];
	/** `YYYY-MM-DD` */
	dateFrom?: string;
	dateTo?: string;
	/** Articles a query keeps at most */
	maxItems?: number;
	resolveOriginalUrl?: boolean;
	includeArticleDetails?: boolean;
}

export interface GoogleNewsItem {
	type?: string;
	url?: string;
	title?: string;
	description?: string;
	/** The outlet's name */
	source?: string;
	publishedAt?: string;
	searchQuery?: string;
	errorCode?: string;
}

export const GOOGLE_NEWS_ACTOR = defineActor<GoogleNewsInput, GoogleNewsItem>(
	'scrapewise/google-news-scraper',
);
