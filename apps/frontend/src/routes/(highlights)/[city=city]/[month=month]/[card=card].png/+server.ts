import { ImageResponse } from '@ethercorps/sveltekit-og';
import type { RequestHandler } from '@sveltejs/kit';
import type { CityHighlightOutputDto } from 'client';

import HighlightCardImage from './components/HighlightCardImage.svelte';

import { createLoadApi, isNotFoundError } from '#lib/api.js';
import { HIGHLIGHT_CARDS, type HighlightCard } from '#lib/highlights.js';
import { satoriMarkup } from '#lib/og-image.js';

// The month's share images from one renderer: `og.png` for links, `square.png` and
// `portrait.png` for Instagram. Published months only, like the page.
export const GET: RequestHandler = async ({ params, fetch }) => {
	const api = createLoadApi(fetch);
	const card = params.card as HighlightCard;
	const { width, height } = HIGHLIGHT_CARDS[card];
	try {
		const highlight = (await api.highlights.getCityHighlight(params.city!, params.month!)) as CityHighlightOutputDto;
		return new ImageResponse(satoriMarkup(HighlightCardImage, { highlight, card }), {
			width,
			height,
			debug: false,
			tailwindConfig: {}
		});
	} catch (e) {
		return new Response(null, { status: isNotFoundError(e) ? 404 : 500 });
	}
};
