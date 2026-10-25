import type { MetaTagsProps } from 'svelte-meta-tags';

export function load({ url }) {
	const pageMetaTags: MetaTagsProps = {
		title: 'Unsubscribe',
		// A personal link: never indexed, never followed
		robots: 'noindex, nofollow'
	};
	return { token: url.searchParams.get('token') ?? '', pageMetaTags };
}
