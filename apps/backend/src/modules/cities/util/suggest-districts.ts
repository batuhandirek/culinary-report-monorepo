import _ from 'lodash';

import type { CityDistrict } from '../interfaces/city-district.interface.js';

/** How many of the city's venues Google put in one district under one postal code. */
export interface DistrictPostalCount {
	postalCode: string;
	district: string;
	venues: number;
}

/** A district the venue scrape suggests, for the admin to review before saving. */
export interface SuggestedDistrict extends CityDistrict {
	/** The city's venues in it */
	venues: number;
	/** Not one of the city's districts yet */
	isNew: boolean;
}

// A name Google gives fewer venues than this is noise (a place over the city line), not a district
export const MIN_DISTRICT_VENUES = 3;
// Two districts border each other when both have this many venues under one postal code
const MIN_SHARED_VENUES = 2;

/**
 * Districts with their postal codes, read from where the venue scrape put the city's venues:
 * each postal code goes to the district most of its venues are in (the reverse of
 * `VenueService.fillDistricts`), so a code is listed once. The city's own districts come first
 * and keep their borders; a name with at least `MIN_DISTRICT_VENUES` venues is added as new.
 * A district without borders gets the ones the data suggests: districts sharing a postal code
 * with it, plus those listing it. Pure.
 */
export const suggestDistricts = (
	rows: DistrictPostalCount[],
	existing: CityDistrict[],
	minVenues = MIN_DISTRICT_VENUES,
): SuggestedDistrict[] => {
	const totals = _.mapValues(_.groupBy(rows, 'district'), group => _.sumBy(group, 'venues'));
	const known = new Set(existing.map(d => d.name));
	const fresh = _.sortBy(
		Object.keys(totals).filter(name => !known.has(name) && totals[name] >= minVenues),
		name => -totals[name],
	);
	const names = [...existing.map(d => d.name), ...fresh];
	const inCity = new Set(names);

	const byCode = _.groupBy(
		rows.filter(r => inCity.has(r.district)),
		'postalCode',
	);
	const codes = new Map<string, string[]>(names.map(name => [name, []]));
	const shared = new Map<string, Set<string>>(names.map(name => [name, new Set()]));
	for (const [code, group] of Object.entries(byCode)) {
		const majority = _.maxBy(_.sortBy(group, 'district'), 'venues')!;
		codes.get(majority.district)!.push(code);
		const strong = group.filter(r => r.venues >= MIN_SHARED_VENUES).map(r => r.district);
		for (const a of strong) for (const b of strong) if (a !== b) shared.get(a)!.add(b);
	}

	return names.map(name => {
		const own = existing.find(d => d.name === name);
		const neighbours =
			own?.neighbours.length ?
				own.neighbours
			:	_.uniq([
					...shared.get(name)!,
					...existing.filter(d => d.neighbours.includes(name)).map(d => d.name),
				]).sort();
		return {
			name,
			postalCodes: codes.get(name)!.sort(),
			neighbours,
			venues: totals[name] ?? 0,
			isNew: !own,
		};
	});
};
