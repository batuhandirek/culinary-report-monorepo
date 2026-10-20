/** One district of a city (`City.districts`). */
export interface CityDistrict {
	// As Google Maps names it, e.g. "Friedrichshain-Kreuzberg"
	name: string;
	// Postal codes inside it: a venue with one gets the district when Google leaves it empty
	postalCodes: string[];
	// Districts sharing a border with it, listed on both sides
	neighbours: string[];
}
