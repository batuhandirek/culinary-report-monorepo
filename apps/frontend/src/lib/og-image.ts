import type { Component } from 'svelte';

import { render } from 'svelte/server';

import { BRAND_BITE, BRAND_WORDMARK } from '#constants/BRAND_LOGO.js';

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

/**
 * The drawn wordmark for a card, as an `<img>` source and its size. Satori draws an SVG through
 * `<img>`; size it with `style` (`width: …px; height: …px`), never `width="…"` attributes: the
 * markup reaches satori as a string, the attributes arrive as text and the image is dropped.
 */
export const ogWordmark = (fill: string, height: number) => {
	const width = Math.round((height * BRAND_WORDMARK.width) / BRAND_WORDMARK.height);
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${BRAND_WORDMARK.width} ${BRAND_WORDMARK.height}"><path fill="${fill}" d="${BRAND_WORDMARK.d}"/></svg>`;
	return { src: `data:image/svg+xml;base64,${btoa(svg)}`, style: `width: ${width}px; height: ${height}px;` };
};

/**
 * The brand's bite for a card, as an `<img>` source and its style: satori has no masks, so a card
 * lays the shape over a corner in its ground colour. `radius` reaches the tooth tips; the centre
 * sits `inset` × radius in from the corner (the `bite` utility's 0.375).
 */
export const ogBite = (fill: string, radius: number, inset = 0.375) => {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${radius * 2}" height="${radius * 2}" viewBox="0 0 ${BRAND_BITE.size} ${BRAND_BITE.size}"><path fill="${fill}" d="${BRAND_BITE.d}"/></svg>`;
	const offset = -radius * (1 - inset);
	return {
		src: `data:image/svg+xml;base64,${btoa(svg)}`,
		style: `position: absolute; top: ${offset}px; right: ${offset}px; width: ${radius * 2}px; height: ${radius * 2}px;`
	};
};
