// Wording, URLs and structured data of a city's public quarter of food trends
// (`/<city>/trends/<YYYY>-q<N>`), shared by the page, its share images and the admin preview.
// Pure: safe on the server.
import type { FoodTrendsData } from 'client';

import { monthLabel } from '#lib/culinary.js';

const SITE = 'https://culinaryreport.com';

export const foodTrendsPath = (citySlug: string, quarter: string) => `/${citySlug}/trends/${quarter}`;
export const foodTrendsUrl = (citySlug: string, quarter: string) =>
	`${SITE}${foodTrendsPath(citySlug, quarter)}`;

/** `2026-q3` → "Q3 2026". */
export const quarterLabel = (quarter: string) => {
	const [year, q] = quarter.split('-');
	return `${q.toUpperCase()} ${year}`;
};

/** The quarter's months as one span: "July to September 2026". */
export const quarterSpan = (months: string[]) => {
	const first = monthLabel(months[0]).split(' ')[0];
	return `${first} to ${monthLabel(months.at(-1)!)}`;
};

/** The quarter a year earlier: `2026-q3` → `2025-q3`. */
export const yearBefore = (quarter: string) => {
	const [year, q] = quarter.split('-');
	return `${Number(year) - 1}-${q}`;
};

/** The last `count` quarters that are over, newest first. */
export const recentQuarters = (count = 6, now = new Date()): string[] => {
	let year = now.getUTCFullYear();
	let q = Math.floor(now.getUTCMonth() / 3) + 1;
	return Array.from({ length: count }, () => {
		q -= 1;
		if (q === 0) {
			q = 4;
			year -= 1;
		}
		return `${year}-q${q}`;
	});
};

export const foodTrendsTitle = (cityName: string, quarter: string) =>
	`${cityName} food trends, ${quarterLabel(quarter)}`;

/** "+60 %", rounded to whole percent. */
export const percentUp = (change: number) => `+${Math.round(change * 100)} %`;

/** One sentence of what the quarter shows, from whichever sections it has. */
export const foodTrendsSummary = (cityName: string, quarter: string, data: FoodTrendsData) => {
	const parts: string[] = [];
	const rising = data.searches?.rising[0];
	if (rising?.change !== undefined) {
		parts.push(`Google searches for ${rising.label.toLowerCase()} in ${cityName} rose ${percentUp(rising.change)} on a year earlier`);
	} else if (data.searches?.top[0]) {
		parts.push(`${data.searches.top[0].label} was ${cityName}'s most searched kind of food`);
	}
	const talked = data.talked?.topics[0];
	if (talked) {
		parts.push(`${talked.label} came up in ${Math.round(talked.share)} % of the TikTok and Instagram posts naming a kind of food`);
	}
	if (data.openings?.opened) {
		parts.push(`${data.openings.opened} new ${data.openings.opened === 1 ? 'place' : 'places'} opened`);
	}
	const lead = parts.length ? parts.join('; ') : `What ${cityName} searched for and posted about`;
	return `${lead}, ${quarterSpan(data.months)}.`;
};

/**
 * The page as an article, a list of the most searched kinds of food and its breadcrumb. Google's
 * rising queries are its users' words, so render the result through `SafeJsonLd`.
 */
export const foodTrendsJsonLd = (
	city: { slug: string; name: string },
	quarter: string,
	data: FoodTrendsData,
	publishedAt: string
): Record<string, unknown>[] => {
	const url = foodTrendsUrl(city.slug, quarter);
	const title = foodTrendsTitle(city.name, quarter);
	const list = data.searches?.top ?? data.talked?.topics ?? [];
	return [
		{
			'@type': 'Article',
			mainEntityOfPage: url,
			url,
			headline: title,
			description: foodTrendsSummary(city.name, quarter, data),
			image: `${url}/og.png`,
			datePublished: publishedAt,
			inLanguage: 'en',
			about: { '@type': 'City', name: city.name },
			publisher: { '@type': 'Organization', name: 'Culinary Report', url: SITE }
		},
		...(list.length
			? [
					{
						'@type': 'ItemList',
						name: data.searches ? `Most searched kinds of food in ${city.name}` : `Most talked-about kinds of food in ${city.name}`,
						itemListOrder: 'https://schema.org/ItemListOrderDescending',
						numberOfItems: list.length,
						itemListElement: list.map((topic, i) => ({ '@type': 'ListItem', position: i + 1, name: topic.label }))
					}
				]
			: []),
		{
			'@type': 'BreadcrumbList',
			itemListElement: [
				{ '@type': 'ListItem', position: 1, name: 'Culinary Report', item: SITE },
				{ '@type': 'ListItem', position: 2, name: title, item: url }
			]
		}
	];
};
