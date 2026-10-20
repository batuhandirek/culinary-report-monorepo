import type { CityDistrict } from 'client';

// A city's districts as the admin form edits them: one per line,
// `Name | postal codes | neighbours`, e.g. `Neukölln | 12043 12045 | Friedrichshain-Kreuzberg, Tempelhof-Schöneberg`.

export const districtsToText = (districts: CityDistrict[]): string =>
	districts
		.map((d) => [d.name, d.postalCodes.join(' '), d.neighbours.join(', ')].join(' | '))
		.join('\n');

/**
 * Parses the lines back. A border is listed on both sides, whichever side the admin wrote it
 * on; a neighbour that is not a district of the city is dropped.
 */
export const textToDistricts = (text: string): CityDistrict[] => {
	const districts: CityDistrict[] = text
		.split('\n')
		.map((line) => line.split('|').map((part) => part.trim()))
		.filter(([name]) => !!name)
		.map(([name, codes = '', neighbours = '']) => ({
			name,
			postalCodes: [...new Set(codes.split(/[\s,]+/).filter(Boolean))],
			neighbours: neighbours
				.split(',')
				.map((n) => n.trim())
				.filter(Boolean)
		}));
	const byName = new Map(districts.map((d) => [d.name, d]));
	for (const district of districts) {
		district.neighbours = district.neighbours.filter((n) => byName.has(n) && n !== district.name);
		for (const n of district.neighbours) {
			const other = byName.get(n)!;
			if (!other.neighbours.includes(district.name)) other.neighbours.push(district.name);
		}
	}
	return districts.map((d) => ({ ...d, neighbours: [...new Set(d.neighbours)] }));
};
