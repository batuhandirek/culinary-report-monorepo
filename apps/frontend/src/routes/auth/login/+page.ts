import type { MetaTagsProps } from 'svelte-meta-tags';

export function load() {
	const pageMetaTags: MetaTagsProps = { title: 'Giriş yap', robots: 'noindex, nofollow' };
	return { pageMetaTags };
}
