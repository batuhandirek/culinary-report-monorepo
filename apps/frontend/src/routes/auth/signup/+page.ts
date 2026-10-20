import type { MetaTagsProps } from 'svelte-meta-tags';

export function load() {
	const pageMetaTags: MetaTagsProps = { title: 'Üye ol', robots: 'noindex, nofollow' };
	return { pageMetaTags };
}
