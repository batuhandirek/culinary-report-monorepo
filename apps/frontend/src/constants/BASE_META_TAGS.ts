import type { MetaTagsProps } from 'svelte-meta-tags';

import { OG_IMAGE_LINK } from './OG_IMAGE';

const TITLE = 'Social media reports for restaurants';
const DESCRIPTION =
	'A monthly report on what TikTok, Instagram and Google reviews say about your restaurant, bar or café.';

/**
 * Site-wide meta tag defaults, merged under every route's own `pageMetaTags`.
 *
 * A plain constant rather than something the root `+layout.ts` returns from `load`: that
 * load is `ssr = false`, so anything it produced was missing from the server-rendered HTML
 * and every SSR'd route had to restate the whole block to compensate. Imported directly by
 * `routes/+layout.svelte`, these reach SSR and the client alike.
 *
 * Only truly global values belong here. `deepMerge` merges nested objects, so anything
 * page-specific — `canonical`, `openGraph.url`, `openGraph.title` — leaks onto routes that
 * don't override it; those stay in the route's own `pageMetaTags`.
 */
export const BASE_META_TAGS: MetaTagsProps = {
	// The page's own words first: a result's title is cut off from the end, and nobody is
	// searching for the brand yet. The homepage opts back into brand-first.
	titleTemplate: '%s | Munchwerk',
	title: TITLE,
	description: DESCRIPTION,
	canonical: 'https://munchwerk.com',
	openGraph: {
		type: 'website',
		url: 'https://munchwerk.com',
		title: TITLE,
		description: DESCRIPTION,
		siteName: 'Munchwerk',
		images: [
			{
				url: OG_IMAGE_LINK,
				width: 1200,
				height: 630,
				alt: "Munchwerk: what the city's munching"
			}
		]
	},
	twitter: {
		cardType: 'summary_large_image',
		title: TITLE,
		description: DESCRIPTION
	}
};
