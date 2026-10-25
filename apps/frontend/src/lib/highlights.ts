// Wording, URLs and structured data of a city's public month (`/<city>/<month>`), shared by the
// page, its share images and the admin preview. Pure: safe on the server.
import type { CityHighlightData, CityHighlightRiser } from 'client';

import { compact, monthLabel } from '#lib/culinary.js';

const SITE = 'https://munchwerk.com';

export const highlightPath = (citySlug: string, month: string) => `/${citySlug}/${month}`;
export const highlightUrl = (citySlug: string, month: string) =>
	`${SITE}${highlightPath(citySlug, month)}`;

/** The three share images: a link card and Instagram's square and portrait. */
export const HIGHLIGHT_CARDS = {
	og: { width: 1200, height: 630, label: 'Link card' },
	square: { width: 1080, height: 1080, label: 'Instagram square' },
	portrait: { width: 1080, height: 1350, label: 'Instagram portrait' }
} as const;
export type HighlightCard = keyof typeof HIGHLIGHT_CARDS;

export const highlightTitle = (cityName: string, month: string) =>
	`${cityName}'s most talked-about places, ${monthLabel(month)}`;

/** One sentence of our own counts: what the month's posts by others add up to. */
export const highlightSummary = (cityName: string, month: string, data: CityHighlightData) => {
	const { totals } = data;
	const lead = data.brands[0];
	return `${totals.posts.toLocaleString('en')} TikTok and Instagram posts by ${totals.creators.toLocaleString('en')} creators named ${totals.brands.toLocaleString('en')} places in ${cityName} in ${monthLabel(month)}${lead ? `; ${lead.name} came first` : ''}.`;
};

export const views = (n: number) => `${compact(n)} views`;

/** How a riser climbed, in the list's words. */
export const climbLabel = (row: Pick<CityHighlightRiser, 'rank' | 'prevRank'>) =>
	row.prevRank === undefined
		? `new at #${row.rank}`
		: `#${row.prevRank} → #${row.rank}`;

export const PLATFORM_NAMES: Record<string, string> = { tiktok: 'TikTok', instagram: 'Instagram', blog: 'Blog' };

/**
 * The page as a list of places, an article of the month and its breadcrumb. Names come from
 * Google and posts, so render the result through `SafeJsonLd`.
 */
export const highlightJsonLd = (
	city: { slug: string; name: string },
	month: string,
	data: CityHighlightData,
	publishedAt: string
): Record<string, unknown>[] => {
	const url = highlightUrl(city.slug, month);
	const title = highlightTitle(city.name, month);
	return [
		{
			'@type': 'Article',
			mainEntityOfPage: url,
			url,
			headline: title,
			description: highlightSummary(city.name, month, data),
			image: `${url}/og.png`,
			datePublished: publishedAt,
			inLanguage: 'en',
			about: { '@type': 'City', name: city.name },
			publisher: { '@type': 'Organization', name: 'Munchwerk', url: SITE }
		},
		{
			'@type': 'ItemList',
			name: title,
			itemListOrder: 'https://schema.org/ItemListOrderDescending',
			numberOfItems: data.brands.length,
			itemListElement: data.brands.map((brand) => ({
				'@type': 'ListItem',
				position: brand.rank,
				item: {
					'@type': 'Restaurant',
					name: brand.name,
					...(brand.district
						? { address: { '@type': 'PostalAddress', addressLocality: city.name, addressRegion: brand.district } }
						: {})
				}
			}))
		},
		{
			'@type': 'BreadcrumbList',
			itemListElement: [
				{ '@type': 'ListItem', position: 1, name: 'Munchwerk', item: SITE },
				{ '@type': 'ListItem', position: 2, name: title, item: url }
			]
		}
	];
};
