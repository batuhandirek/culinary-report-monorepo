import { error } from '@sveltejs/kit';
import type { BlogEntryOutputDto } from 'client';
import type { MetaTagsProps } from 'svelte-meta-tags';

import { createLoadApi, isNotFoundError } from '#lib/api.js';
import { blogEntryDate, pickNextBlogEntries } from '#lib/blog.js';

export async function load({ params, fetch }) {
	const api = createLoadApi(fetch);

	let entry: BlogEntryOutputDto;
	try {
		entry = await api.blog.getEntry(params.articleId);
	} catch (e) {
		// Only a post that is not there is "not found". A failing API answering 404 would
		// tell a crawler to drop a live article; a 503 says "come back" and gives the reader
		// a retry.
		if (isNotFoundError(e)) error(404);
		error(503, "The article didn't load");
	}

	// Next reads, best-effort (they may not break the article itself): posts sharing the
	// article's first tag, topped up with the newest (listEntries is publishedAt DESC).
	const firstTag = entry.tags?.[0]?.slug;
	const [sameTopic, latest] = await Promise.all([
		firstTag
			? api.blog
					.listEntries({ page: 1, size: 4, tag: firstTag })
					.then((res) => res.items)
					.catch(() => [])
			: [],
		api.blog
			.listEntries({ page: 1, size: 4 })
			.then((res) => res.items)
			.catch(() => [])
	]);
	const next = pickNextBlogEntries(sameTopic, latest, { exclude: entry.id });

	const canonical = `https://culinaryreport.com/blog/${entry.slug}`;
	const ogImage = `${canonical}/og.png`;
	// Editors leave stray spaces at the end of a headline; in a `<title>` they show.
	const title = entry.title.trim();
	const description = entry.excerpt?.trim() || title;
	const pageMetaTags: MetaTagsProps = {
		title,
		description,
		canonical,
		openGraph: {
			type: 'article',
			url: canonical,
			title,
			description,
			images: [{ url: ogImage, alt: title, width: 1200, height: 630 }],
			article: {
				publishedTime: blogEntryDate(entry),
				...(entry.tags?.length
					? { section: entry.tags[0].name, tags: entry.tags.map((tag) => tag.name) }
					: {})
			}
		},
		twitter: {
			cardType: 'summary_large_image',
			title,
			description
		}
	};

	return { entry, next, pageMetaTags };
}
