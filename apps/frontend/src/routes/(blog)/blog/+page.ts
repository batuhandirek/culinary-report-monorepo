import type { MetaTagsProps } from 'svelte-meta-tags';

import { createLoadApi } from '#lib/api.js';

const PAGE_SIZE = 12;

export async function load({ fetch }) {
	const api = createLoadApi(fetch);

	// Only the first page is fetched here; the list is an infinite scroller that hydrates
	// from this payload and pages on from the client (see `../components/BlogEntryFeed.svelte`), so
	// there are no `?page=` URLs to canonicalise or keep out of the index.
	const entries = await api.blog.listEntries({ page: 1, size: PAGE_SIZE });

	const blogUrl = 'https://munchwerk.com/blog';
	const title = 'Blog';
	const description =
		'What guests post about restaurants, bars and cafés on TikTok, Instagram and Google, and what to do about it.';

	const pageMetaTags: MetaTagsProps = {
		title,
		description,
		canonical: blogUrl,
		openGraph: {
			url: blogUrl,
			title: 'Munchwerk blog',
			description
		},
		twitter: { title: 'Munchwerk blog', description }
	};

	return { entries, pageSize: PAGE_SIZE, pageMetaTags };
}
