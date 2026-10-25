import type { BlogEntrySummaryOutputDto, LandingEditionOutputDto } from 'client';
import type { MetaTagsProps } from 'svelte-meta-tags';

import { LANDING_CITY, type LandingData, latestPath, MONTH_PATH, QUARTER_PATH } from './components/landing.js';

import { createLoadApi } from '#lib/api.js';
import { highlightUrl } from '#lib/highlights.js';

// The front door: server-rendered for crawlers and link previews.
export const ssr = true;

const TITLE = "Munchwerk — what Berlin's munching";
const DESCRIPTION =
	'The places Berlin posts about most, counted every five days from public TikTok, Instagram and blog posts. No ads, no paid placements, no star ratings.';

/** Published paths of one sitemap section: only published months and quarters are listed. */
const publishedPaths = async (api: ReturnType<typeof createLoadApi>, name: string) => {
	const { items } = (await api.sitemap.getEntries(name, { page: 1, size: 10000 })) as { items: { path: string }[] };
	return items.map((i) => i.path);
};

export async function load({ fetch }) {
	const api = createLoadApi(fetch);

	// Every part fails on its own: a missing edition leaves the page in its "counting" state
	// rather than failing the front door.
	const [edition, months, quarters, posts] = await Promise.all([
		(api.landing.getLandingEdition(LANDING_CITY.slug) as Promise<LandingEditionOutputDto>).catch(() => null),
		publishedPaths(api, 'highlights').catch(() => [] as string[]),
		publishedPaths(api, 'foodtrends').catch(() => [] as string[]),
		(api.blog.listEntries({ page: 1, size: 3 }) as Promise<{ items: BlogEntrySummaryOutputDto[] }>)
			.then((r) => r.items)
			.catch(() => [] as BlogEntrySummaryOutputDto[])
	]);
	const monthPath = latestPath(months, MONTH_PATH);

	const canonical = 'https://munchwerk.com';
	const month = monthPath?.match(MONTH_PATH)?.[1];
	const image = month
		? { url: `${highlightUrl(LANDING_CITY.slug, month)}/og.png`, alt: TITLE, width: 1200, height: 630 }
		: undefined;
	const pageMetaTags: MetaTagsProps = {
		// The one page whose title leads with the brand
		title: TITLE,
		titleTemplate: '%s',
		description: DESCRIPTION,
		canonical,
		openGraph: {
			type: 'website',
			url: canonical,
			title: TITLE,
			description: DESCRIPTION,
			...(image ? { images: [image] } : {})
		},
		twitter: { cardType: 'summary_large_image', title: TITLE, description: DESCRIPTION }
	};

	const data: LandingData = { edition, monthPath, trendsPath: latestPath(quarters, QUARTER_PATH), posts };
	return { ...data, pageMetaTags };
}
