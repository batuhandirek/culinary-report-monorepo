import { error } from '@sveltejs/kit';
import type { MetaTagsProps } from 'svelte-meta-tags';

import { createLoadApi, isNotFoundError } from '#lib/api.js';
import { monthLabel } from '#lib/culinary.js';

// Server-rendered so a link preview (WhatsApp, iMessage, mail) shows the venue and month.
// Reading the report does not count an open; the page counts one from the browser.
export const ssr = true;

export async function load({ params, fetch, url }) {
	const api = createLoadApi(fetch);
	let report;
	try {
		report = await api.reports.getSharedReport(params.token);
	} catch (e) {
		if (isNotFoundError(e)) error(404, 'This link does not exist or was turned off');
		throw e;
	}

	const title = `${report.brand.name} · ${monthLabel(report.month)}`;
	const href = `${url.origin}/r/${params.token}`;
	const pageMetaTags: MetaTagsProps = {
		title,
		description: report.highlights.headline,
		// A private link: never indexed, never followed
		robots: 'noindex, nofollow',
		canonical: href,
		openGraph: { url: href, title, description: report.highlights.headline },
		twitter: { title, description: report.highlights.headline }
	};
	return { report, token: params.token, pageMetaTags };
}
