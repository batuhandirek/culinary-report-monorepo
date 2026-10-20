import type { MetaTagsProps } from 'svelte-meta-tags';

// Private: a venue's own numbers. Pages name themselves; this is the fallback.
export function load() {
	const pageMetaTags: MetaTagsProps = { title: 'Portal', robots: 'noindex, nofollow' };
	return { pageMetaTags };
}
