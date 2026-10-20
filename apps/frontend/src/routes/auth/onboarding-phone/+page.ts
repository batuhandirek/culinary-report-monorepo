import type { MetaTagsProps } from 'svelte-meta-tags';

export function load() {
	const pageMetaTags: MetaTagsProps = {
		title: 'Telefon numaranı ekle',
		robots: 'noindex, nofollow'
	};
	return { pageMetaTags };
}
