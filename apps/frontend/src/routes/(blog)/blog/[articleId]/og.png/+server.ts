import { ImageResponse } from '@ethercorps/sveltekit-og';
import type { RequestHandler } from '@sveltejs/kit';

import BlogOgImage from './components/BlogOgImage.svelte';

import { createLoadApi, isNotFoundError } from '#lib/api.js';
import { ogFonts } from '#lib/og-fonts.js';
import { satoriMarkup } from '#lib/og-image.js';

export const GET: RequestHandler = async ({ params, fetch }) => {
	const api = createLoadApi(fetch);
	try {
		const entry = await api.blog.getEntry(params.articleId!);

		return new ImageResponse(satoriMarkup(BlogOgImage, { entry }), {
			width: 1200,
			height: 630,
			fonts: await ogFonts(),
			debug: false,
			tailwindConfig: {}
		});
	} catch (e) {
		return new Response(null, { status: isNotFoundError(e) ? 404 : 500 });
	}
};
