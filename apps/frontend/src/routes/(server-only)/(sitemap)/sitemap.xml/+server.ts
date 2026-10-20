import type { RequestHandler } from '@sveltejs/kit';

import { createLoadApi } from '#lib/api.js';
import { generateSitemapIndexXml, ORIGIN, SITEMAP_PAGE_SIZE, xmlResponse } from '#lib/sitemap.js';

export const GET: RequestHandler = async ({ fetch }) => {
	// SvelteKit's server-side global `fetch` rejects the relative `PUBLIC_API_URL`; the
	// event's `fetch` resolves it against the current origin (and short-circuits the
	// request when the API is same-process).
	const api = createLoadApi(fetch);
	const sitemaps: { loc: string }[] = [{ loc: `${ORIGIN}/sitemap-static.xml` }];

	try {
		// One file per page of every section the backend has registered
		const { items } = await api.sitemap.getSections();
		for (const section of items) {
			const pages = Math.ceil(section.totalItems / SITEMAP_PAGE_SIZE);
			for (let i = 1; i <= pages; i++) {
				sitemaps.push({ loc: `${ORIGIN}/sitemap-${section.name}-${i}.xml` });
			}
		}
		return xmlResponse(generateSitemapIndexXml(sitemaps), 3600);
	} catch (error) {
		console.error('Error generating sitemap index:', error);
		return xmlResponse(generateSitemapIndexXml(sitemaps.slice(0, 1)), 600);
	}
};
