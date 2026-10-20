import type { MetaTagsProps } from 'svelte-meta-tags';

export function load() {
	const pageMetaTags: MetaTagsProps = { title: 'Trends · Portal', robots: 'noindex, nofollow' };
	return { pageMetaTags };
}
