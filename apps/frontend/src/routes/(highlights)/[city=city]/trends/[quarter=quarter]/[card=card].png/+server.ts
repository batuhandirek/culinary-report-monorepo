import { ImageResponse } from '@ethercorps/sveltekit-og';
import type { RequestHandler } from '@sveltejs/kit';
import type { FoodTrendsReportOutputDto } from 'client';

import FoodTrendsCardImage from './components/FoodTrendsCardImage.svelte';

import { createLoadApi, isNotFoundError } from '#lib/api.js';
import { HIGHLIGHT_CARDS, type HighlightCard } from '#lib/highlights.js';
import { satoriMarkup } from '#lib/og-image.js';

// The quarter's share images in the city month's three sizes, from one renderer: `og.png` for
// links, `square.png` and `portrait.png` for Instagram. Published quarters only, like the page.
export const GET: RequestHandler = async ({ params, fetch }) => {
	const api = createLoadApi(fetch);
	const card = params.card as HighlightCard;
	const { width, height } = HIGHLIGHT_CARDS[card];
	try {
		const report = (await api.foodTrends.getFoodTrendsReport(params.city!, params.quarter!)) as FoodTrendsReportOutputDto;
		return new ImageResponse(satoriMarkup(FoodTrendsCardImage, { report, card }), {
			width,
			height,
			debug: false,
			tailwindConfig: {}
		});
	} catch (e) {
		return new Response(null, { status: isNotFoundError(e) ? 404 : 500 });
	}
};
