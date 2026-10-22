import { error } from '@sveltejs/kit';
import type { CityHighlightOutputDto } from 'client';
import type { MetaTagsProps } from 'svelte-meta-tags';

import { createLoadApi, isNotFoundError } from '#lib/api.js';
import { highlightSummary, highlightTitle, highlightUrl } from '#lib/highlights.js';

export async function load({ params, fetch }) {
	const api = createLoadApi(fetch);

	let highlight: CityHighlightOutputDto;
	try {
		highlight = (await api.highlights.getCityHighlight(params.city, params.month)) as CityHighlightOutputDto;
	} catch (e) {
		// An unknown city or a month nobody published is "not there"; a failing API is a 503, so
		// a crawler comes back rather than dropping a live page
		if (isNotFoundError(e)) error(404);
		error(503, "This page didn't load");
	}

	const { city, month, data } = highlight;
	const canonical = highlightUrl(city.slug, month);
	const title = highlightTitle(city.name, month);
	const description = highlightSummary(city.name, month, data);
	const pageMetaTags: MetaTagsProps = {
		title,
		description,
		canonical,
		openGraph: {
			type: 'article',
			url: canonical,
			title,
			description,
			images: [{ url: `${canonical}/og.png`, alt: title, width: 1200, height: 630 }],
			article: { publishedTime: String(highlight.publishedAt) }
		},
		twitter: { cardType: 'summary_large_image', title, description }
	};

	return { highlight, pageMetaTags };
}
