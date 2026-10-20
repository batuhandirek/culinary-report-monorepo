import type { MetaTagsProps } from 'svelte-meta-tags';

export function load() {
	const pageMetaTags: MetaTagsProps = { title: 'Settings · Portal', robots: 'noindex, nofollow' };
	return { pageMetaTags };
}
