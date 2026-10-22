import { error } from '@sveltejs/kit';
import type { FoodTrendsReportOutputDto } from 'client';
import type { MetaTagsProps } from 'svelte-meta-tags';

import { createLoadApi, isNotFoundError } from '#lib/api.js';
import { foodTrendsSummary, foodTrendsTitle, foodTrendsUrl } from '#lib/food-trends.js';

export async function load({ params, fetch }) {
	const api = createLoadApi(fetch);

	let report: FoodTrendsReportOutputDto;
	try {
		report = (await api.foodTrends.getFoodTrendsReport(params.city, params.quarter)) as FoodTrendsReportOutputDto;
	} catch (e) {
		// An unknown city or a quarter nobody published is "not there"; a failing API is a 503, so
		// a crawler comes back rather than dropping a live page
		if (isNotFoundError(e)) error(404);
		error(503, "This page didn't load");
	}

	const { city, quarter, data } = report;
	const canonical = foodTrendsUrl(city.slug, quarter);
	const title = foodTrendsTitle(city.name, quarter);
	const description = foodTrendsSummary(city.name, quarter, data);
	const pageMetaTags: MetaTagsProps = {
		title,
		description,
		canonical,
		openGraph: {
			type: 'article',
			url: canonical,
			title,
			description,
			images: [{ url: `${canonical}/og.png`, alt: title, width: 1200, height: 630 }],
			article: { publishedTime: String(report.publishedAt) }
		},
		twitter: { cardType: 'summary_large_image', title, description }
	};

	return { report, pageMetaTags };
}
