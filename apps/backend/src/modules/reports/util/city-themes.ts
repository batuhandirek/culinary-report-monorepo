// Pure: a brand's complaint themes against the month's report venues of its city.

import _ from 'lodash';

import type { ReportCityTheme } from '../interfaces/report-data.interface.js';

import type { ReportAspects } from './summarize-report.js';

/** Written reviews a brand needs this month for its shares to be shown or to count in a median */
export const CITY_THEME_MIN_WRITTEN = 5;
/** Report brands a median needs */
export const CITY_THEME_MIN_PEERS = 5;
const CITY_THEMES_SHOWN = 5;

/** One complaint point of a written review this month, with the brand whose branch it is about */
export interface CityThemeComplaint {
	brandId: string;
	reviewId: string;
	/** Null while the point is not filed */
	theme: string | null;
}

const median = (values: number[]) => {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * The complaint themes the brand's written reviews raise this month, each as the share of them
 * raising it (a review once per theme) against the median share at the month's other report brands
 * with `CITY_THEME_MIN_WRITTEN`+ written reviews: "a price increase was criticised in 18 % of your
 * written reviews; 4 % at the month's report venues". The biggest gap first; a root ("about price,
 * nothing finer") and a key `aspects` does not know are no finding. Undefined below the floors, and
 * while any of the brand's complaint points is unfiled (a share is whole or absent); a peer with an
 * unfiled point stays out of the medians.
 */
export const cityThemes = (input: {
	brandId: string;
	complaints: CityThemeComplaint[];
	/** Written reviews this month per report brand, this one included */
	written: Map<string, number>;
	aspects: Pick<ReportAspects, 'isAspect' | 'isRoot' | 'label' | 'rootOf'>;
}): ReportCityTheme[] | undefined => {
	const own = input.written.get(input.brandId) ?? 0;
	if (own < CITY_THEME_MIN_WRITTEN) return undefined;
	const byBrand = _.groupBy(input.complaints, c => c.brandId);
	if ((byBrand[input.brandId] ?? []).some(c => !c.theme)) return undefined;
	// Theme → reviews raising it, per brand
	const shares = (brandId: string) => {
		const written = input.written.get(brandId) ?? 0;
		const reviews = _.mapValues(
			_.groupBy(byBrand[brandId] ?? [], c => c.theme),
			list => new Set(list.map(c => c.reviewId)).size,
		);
		return { written, reviews };
	};
	const peers = [...input.written.keys()]
		.filter(id => id !== input.brandId && (input.written.get(id) ?? 0) >= CITY_THEME_MIN_WRITTEN)
		.filter(id => !(byBrand[id] ?? []).some(c => !c.theme))
		.map(shares);
	if (peers.length < CITY_THEME_MIN_PEERS) return undefined;
	const mine = shares(input.brandId);
	const { aspects } = input;
	const rows = Object.entries(mine.reviews)
		.filter(([key]) => aspects.isAspect(key) && !aspects.isRoot(key))
		.map(([key, reviews]): ReportCityTheme => {
			const venueShare = reviews / mine.written;
			const peerMedian = median(peers.map(p => (p.reviews[key] ?? 0) / p.written));
			return {
				key,
				label: aspects.label(key),
				topic: aspects.rootOf(key) ?? key,
				reviews,
				venueShare: round3(venueShare),
				median: round3(peerMedian),
				venues: peers.length,
			};
		});
	return _.orderBy(rows, [r => r.venueShare - r.median, r => r.reviews], ['desc', 'desc']).slice(0, CITY_THEMES_SHOWN);
};
