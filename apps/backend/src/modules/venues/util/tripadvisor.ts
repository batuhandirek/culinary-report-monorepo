// TripAdvisor: finding a venue's page through a web search, and the review actor's item shape.
// Pure functions.

import { isInCity, isSameVenue } from './venue-names.js';

const RESTAURANT_PAGE = /^https?:\/\/(?:[\w-]+\.)*tripadvisor\.[a-z.]+\/Restaurant_Review-g\d+-d(\d+)-/i;

/** The TripAdvisor location id of a restaurant page URL (`…-d3896790-…`), or null. */
export const tripadvisorLocationId = (url: string | null | undefined): string | null =>
	(url && RESTAURANT_PAGE.exec(url)?.[1]) || null;

/** The web search that finds a venue's TripAdvisor page. */
export const tripadvisorQuery = (venueName: string, cityName: string): string => {
	const head = venueName.split(/\s[|\-–·•]\s|[|]/)[0].trim();
	return `site:tripadvisor.com "${head}" ${cityName}`;
};

/**
 * The venue's restaurant page among one search page's organic results: a `Restaurant_Review`
 * URL whose title names the venue and a city of `cityNames` ("CAFÉ FRIEDA, Berlin - Neukölln -
 * Restaurant Reviews, Photos & Phone Number - Tripadvisor" → "CAFÉ FRIEDA" checked with
 * `isSameVenue`, "Berlin" with `isInCity`). Null when none.
 */
export const tripadvisorPageFromSearch = (
	organicResults: { url?: string; title?: string }[],
	venueName: string,
	cityNames: readonly string[],
): string | null => {
	for (const result of organicResults ?? []) {
		if (!result?.url || !result.title || !tripadvisorLocationId(result.url)) continue;
		const [placeName, rest] = result.title.split(/,(.*)/s).map(part => part?.trim());
		// A title without its city can't be told from a namesake elsewhere
		const placeCity = rest?.split(/ - | \| /)[0].trim();
		if (!placeName || !placeCity || !isInCity(placeCity, cityNames)) continue;
		if (isSameVenue(placeName, venueName)) return result.url.split('#')[0].split('?')[0];
	}
	return null;
};

/** What a stored review takes from one item of `scrapeunblocker/tripadvisor-reviews-scraper`. */
export interface TripadvisorReviewFields {
	reviewId: string;
	locationId: string;
	publishedAt: Date;
	stars: number | null;
	text: string | null;
	language: string | null;
	ownerResponse: string | null;
	ownerResponseAt: Date | null;
	likes: number;
	/** The place's all-time figures, repeated on every item */
	placeRating: number | null;
	placeReviewsCount: number | null;
}

/**
 * One review item (`id`, `rating`, `title`, `text`, `publishedDate`, `language`,
 * `ownerResponse`, `placeUrl` / `placeLocationId`, `placeRating`, `placeReviewsCount`). The
 * `user` is never stored; the title leads the text, since reviewers put the verdict there.
 */
export const fromTripadvisorItem = (item: any): TripadvisorReviewFields | null => {
	const locationId =
		item?.placeLocationId != null ? `${item.placeLocationId}` : tripadvisorLocationId(item?.placeUrl);
	if (!item?.id || !item.publishedDate || !locationId) return null;
	const title = typeof item.title === 'string' ? item.title.trim() : '';
	const body = typeof item.text === 'string' ? item.text.trim() : '';
	const text = [title, body].filter(Boolean).join('\n') || null;
	return {
		reviewId: `ta_${item.id}`,
		locationId,
		publishedAt: new Date(item.publishedDate),
		stars: typeof item.rating === 'number' ? item.rating : null,
		text,
		language: item.language ?? null,
		ownerResponse: item.ownerResponse?.text ?? null,
		ownerResponseAt: item.ownerResponse?.publishedDate ? new Date(item.ownerResponse.publishedDate) : null,
		likes: typeof item.helpfulVotes === 'number' ? item.helpfulVotes : 0,
		placeRating: typeof item.placeRating === 'number' ? item.placeRating : null,
		placeReviewsCount: typeof item.placeReviewsCount === 'number' ? item.placeReviewsCount : null,
	};
};
