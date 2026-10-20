// Press and web mentions: the search queries, the two search actors' item shapes and which
// results can be press at all. Pure functions.

import { WebMentionSourceEnum } from '../entities/web-mention.entity.js';

import { plain, venueAliases } from './venue-names.js';

/** A search result that may name the venue. */
export interface WebResult {
	url: string;
	title: string;
	snippet: string | null;
	outlet: string | null;
	publishedAt: Date | null;
	source: WebMentionSourceEnum;
	/** The query that found it: the venue's */
	query: string;
}

// Platforms, directories, booking and delivery sites: listings, not press
const NOT_PRESS = [
	'google.',
	'goo.gl',
	'instagram.com',
	'tiktok.com',
	'facebook.com',
	'youtube.com',
	'x.com',
	'twitter.com',
	'linkedin.com',
	'pinterest.',
	'tripadvisor.',
	'yelp.',
	'foursquare.com',
	'restaurantguru.',
	'opentable.',
	'thefork.',
	'quandoo.',
	'resy.com',
	'lieferando.',
	'wolt.com',
	'deliveroo.',
	'ubereats.',
	'speisekarte.',
	'menu.',
	'gelbeseiten.',
	'dasoertliche.',
	'meinestadt.',
	'wikipedia.org',
];

// `tripadvisor.` covers every country's site (`tripadvisor.de`, `de.tripadvisor.com`); a full
// domain covers its subdomains
export const hostOnDomain = (host: string, domain: string): boolean =>
	domain.endsWith('.') ?
		host.startsWith(domain) || host.includes(`.${domain}`)
	:	host === domain || host.endsWith(`.${domain}`);

/** `www.tip-berlin.de` → `tip-berlin.de`; null for a URL that doesn't parse. */
export const hostOf = (url: string): string | null => {
	try {
		return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
	} catch {
		return null;
	}
};

/** The query for a venue: its name before any slogan, in quotes, with the city. */
export const pressQuery = (venueName: string, cityName: string): string => {
	const head = venueName.split(/\s[|\-–·•]\s|[|]/)[0].trim();
	return plain(head).includes(plain(cityName)) ? `"${head}"` : `"${head}" ${cityName}`;
};

/**
 * Whether a result can be press about the venue: not a platform, directory or the venue's own
 * site, and its title or snippet names the venue (a namesake still passes here; the
 * classification marks it unrelated).
 */
export const isPressCandidate = (
	result: Pick<WebResult, 'url' | 'title' | 'snippet'>,
	venue: { name: string; website?: string | null },
): boolean => {
	const host = hostOf(result.url);
	if (!host) return false;
	if (NOT_PRESS.some(domain => hostOnDomain(host, domain))) return false;
	const own = venue.website ? hostOf(venue.website) : null;
	if (own && (host === own || host.endsWith(`.${own}`))) return false;
	const text = ` ${plain(`${result.title} ${result.snippet ?? ''}`)} `;
	const squashed = text.replace(/ /g, '');
	return venueAliases(venue.name).some(
		alias => alias.length >= 3 && (text.includes(` ${alias} `) || (alias.length >= 6 && squashed.includes(alias.replace(/ /g, '')))),
	);
};

/** One item of `scrapewise/google-news-scraper`; null for an error row or an unusable one. */
export const fromGoogleNewsItem = (item: any): WebResult | null => {
	if (!item || item.errorCode || item.type !== 'article' || !item.url || !item.title) return null;
	const query = typeof item.searchQuery === 'string' ? item.searchQuery : null;
	if (!query) return null;
	return {
		url: item.url,
		title: `${item.title}`.trim(),
		snippet: item.description ?? null,
		outlet: item.source ?? hostOf(item.url),
		publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
		source: WebMentionSourceEnum.NEWS,
		query,
	};
};

/** The organic results of one page of `apify/google-search-scraper`. */
export const fromGoogleSearchPage = (page: any): WebResult[] => {
	const query = page?.searchQuery?.term;
	if (typeof query !== 'string') return [];
	return ((page.organicResults ?? []) as any[])
		.filter(r => r?.url && r.title)
		.map(r => ({
			url: r.url,
			title: `${r.title}`.trim(),
			snippet: r.description ?? null,
			outlet: hostOf(r.url),
			publishedAt: r.date ? new Date(r.date) : null,
			source: WebMentionSourceEnum.WEB,
			query,
		}))
		.map(r => (r.publishedAt && Number.isNaN(r.publishedAt.getTime()) ? { ...r, publishedAt: null } : r));
};
