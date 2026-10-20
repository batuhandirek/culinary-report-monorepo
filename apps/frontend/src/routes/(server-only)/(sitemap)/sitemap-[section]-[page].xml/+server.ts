import { error } from '@sveltejs/kit';

import type { RequestHandler } from './$types';

import { createLoadApi } from '#lib/api.js';
import { generateUrlsetXml, ORIGIN, SITEMAP_PAGE_SIZE, xmlResponse } from '#lib/sitemap.js';

export const GET: RequestHandler = async ({ fetch, params }) => {
	const page = Number(params.page);
	if (!/^[a-z]+$/.test(params.section) || !Number.isInteger(page) || page < 1) error(404);

	const api = createLoadApi(fetch);
	const { items } = await api.sitemap
		.getEntries(params.section, { page, size: SITEMAP_PAGE_SIZE })
		.catch(() => error(404));

	return xmlResponse(
		generateUrlsetXml(items.map((item) => ({ loc: `${ORIGIN}${item.path}`, lastmod: item.updatedAt }))),
		3600
	);
};
