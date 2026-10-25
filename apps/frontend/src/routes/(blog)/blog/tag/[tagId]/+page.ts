import { error } from '@sveltejs/kit';
import type { BlogTagOutputDto, ListBlogEntriesOutputDto } from 'client';
import type { MetaTagsProps } from 'svelte-meta-tags';

import { createLoadApi, isNotFoundError } from '#lib/api.js';
import { blogTagLabel } from '#lib/blog.js';

const PAGE_SIZE = 12;

export async function load({ params, fetch }) {
	const api = createLoadApi(fetch);

	// First page only — the list continues client-side via the infinite-scroll feed.
	let tag: BlogTagOutputDto;
	let entries: ListBlogEntriesOutputDto;
	try {
		[tag, entries] = await Promise.all([
			api.blog.getTag(params.tagId),
			api.blog.listEntries({ page: 1, size: PAGE_SIZE, tag: params.tagId })
		]);
	} catch (e) {
		// Only a tag that is not there is "not found"; a failing API must not tell a crawler
		// that a live topic page is gone.
		if (isNotFoundError(e)) error(404);
		error(503, "The articles didn't load");
	}

	const label = blogTagLabel(tag.name);
	const title = `${label}: articles`;
	const description = `Articles on ${tag.name} for restaurants, bars and cafés, from the Munchwerk blog.`;
	const canonical = `https://munchwerk.com/blog/tag/${tag.slug}`;
	const pageMetaTags: MetaTagsProps = {
		title,
		description,
		canonical,
		openGraph: {
			url: canonical,
			title,
			description
		},
		// Without its own, the site-wide default title leaks onto the card.
		twitter: { title, description }
	};

	return { tag, entries, pageSize: PAGE_SIZE, pageMetaTags };
}
