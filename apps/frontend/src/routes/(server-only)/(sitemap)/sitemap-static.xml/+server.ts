import type { RequestHandler } from '@sveltejs/kit';

import { generateUrlsetXml, ORIGIN, xmlResponse } from '#lib/sitemap.js';

export const GET: RequestHandler = async () => {
	const urls = [{ loc: `${ORIGIN}` }, { loc: `${ORIGIN}/blog` }];

	return xmlResponse(generateUrlsetXml(urls), 86400);
};
