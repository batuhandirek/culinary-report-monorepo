import type { Component } from 'svelte';

import { render } from 'svelte/server';

/**
 * A card component as the markup string `ImageResponse` hands satori. Every `og.png`-style route
 * renders through this instead of passing the component: Svelte escapes `&` and `<` in text and
 * satori prints the entity as it comes ("Reviews &amp; reels"). `&amp;` is decoded; `&lt;` becomes
 * the look-alike `‹`, so user text can never open a tag. `&lt;` goes first, so a literal "&lt;"
 * in the text (`&amp;lt;`) still prints as typed.
 */
export const satoriMarkup = <Props extends Record<string, unknown>>(
	component: Component<Props>,
	props: Props
) => {
	const { body, head } = render(component, { props });
	return (body + head)
		.replace(/<!--[\s\S]*?-->/g, '')
		.replaceAll('&lt;', '‹')
		.replaceAll('&amp;', '&');
};
