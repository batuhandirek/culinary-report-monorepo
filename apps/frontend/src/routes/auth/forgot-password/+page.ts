import type { MetaTagsProps } from 'svelte-meta-tags';

export function load() {
	const pageMetaTags: MetaTagsProps = { title: 'Şifremi unuttum', robots: 'noindex, nofollow' };
	return { pageMetaTags };
}
