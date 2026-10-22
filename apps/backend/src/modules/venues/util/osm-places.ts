// OpenStreetMap's food places as a checklist for the venue list: what Overpass returns, how a
// place is read, matched to a venue and searched on Google Maps. Pure.

import { nameSimilarity, venueAliases } from './venue-names.js';

// OSM tags that make a place a food or drink venue, in the order gaps are looked up: sit-down
// places first, then quick food, then shops
export const OSM_FOOD_AMENITIES = [
	'restaurant',
	'cafe',
	'bar',
	'pub',
	'biergarten',
	'fast_food',
	'ice_cream',
	'food_court',
] as const;
export const OSM_FOOD_SHOPS = ['bakery', 'pastry', 'confectionery'] as const;
const KIND_ORDER: string[] = [...OSM_FOOD_AMENITIES, ...OSM_FOOD_SHOPS];

// An OSM place and its Google venue are one when this close: OSM puts a node on the door or the
// building, Google its own pin (Berlin, 2026-10-21: most pairs within 30 m)
export const OSM_MATCH_RADIUS_M = 150;
// Names at least this alike (trigram Dice of `venueAliases`), or one holding the other
const OSM_NAME_SIMILARITY = 0.6;
// A contained name this short says too little ("asia" in "asia gourmet")
const MIN_CONTAINED_LENGTH = 5;

/** An element of Overpass' `out center tags` JSON: nodes carry lat/lon, ways and relations a centre. */
export interface OverpassElement {
	type: 'node' | 'way' | 'relation';
	id: number;
	lat?: number;
	lon?: number;
	center?: { lat: number; lon: number };
	tags?: Record<string, string>;
}

/** The fields an `OsmPlace` row keeps of an element. */
export interface OsmPlaceFields {
	osmKey: string;
	name: string;
	kind: string;
	lat: number;
	lng: number;
	street: string | null;
	houseNumber: string | null;
	postalCode: string | null;
	tags: Record<string, string>;
}

/** The Overpass query for every food place inside an OSM relation (a city's boundary). */
export const overpassFoodQuery = (relationId: number, timeoutSeconds = 180): string =>
	[
		`[out:json][timeout:${timeoutSeconds}];`,
		// An area's id is its relation's plus 3,600,000,000
		`area(id:${3_600_000_000 + relationId})->.a;`,
		'(',
		`nwr["amenity"~"^(${OSM_FOOD_AMENITIES.join('|')})$"](area.a);`,
		`nwr["shop"~"^(${OSM_FOOD_SHOPS.join('|')})$"](area.a);`,
		');',
		'out center tags;',
	].join('');

/** An element as a place, or null without a name, a food tag or a position. */
export const osmPlaceFields = (el: OverpassElement): OsmPlaceFields | null => {
	const tags = el.tags ?? {};
	const name = tags.name?.trim();
	const kind = [tags.amenity, tags.shop].find(k => k && KIND_ORDER.includes(k));
	const lat = el.lat ?? el.center?.lat;
	const lng = el.lon ?? el.center?.lon;
	if (!name || !kind || lat == null || lng == null) return null;
	return {
		osmKey: `${el.type}/${el.id}`,
		name,
		kind,
		lat,
		lng,
		street: tags['addr:street'] ?? null,
		houseNumber: tags['addr:housenumber'] ?? null,
		postalCode: tags['addr:postcode'] ?? null,
		tags,
	};
};

/** Metres between two points; flat-earth, exact enough within a city. */
export const distanceM = (
	a: { lat: number; lng: number },
	b: { lat: number; lng: number },
): number => {
	const kx = 111_320 * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
	return Math.hypot((a.lat - b.lat) * 110_574, (a.lng - b.lng) * kx);
};

export interface PlacedVenue {
	id: string;
	name: string;
	lat: number;
	lng: number;
}

// Grid cells about 220 m tall and 200 m wide in central Europe: a radius of 150 m stays inside
// a cell and its neighbours
const CELL_LAT = 0.002;
const CELL_LNG = 0.003;
const cellOf = (lat: number, lng: number) => [
	Math.floor(lat / CELL_LAT),
	Math.floor(lng / CELL_LNG),
];

/** Venues bucketed by position, for `matchOsmPlace`'s neighbourhood. */
export class VenueGrid {
	private readonly cells = new Map<string, PlacedVenue[]>();

	constructor(venues: PlacedVenue[]) {
		for (const v of venues) {
			const key = cellOf(v.lat, v.lng).join(':');
			const list = this.cells.get(key);
			if (list) list.push(v);
			else this.cells.set(key, [v]);
		}
	}

	/** The venues within `radius` metres. */
	near(at: { lat: number; lng: number }, radius = OSM_MATCH_RADIUS_M): PlacedVenue[] {
		const [y, x] = cellOf(at.lat, at.lng);
		const out: PlacedVenue[] = [];
		for (let dy = -1; dy <= 1; dy++)
			for (let dx = -1; dx <= 1; dx++)
				for (const v of this.cells.get(`${y + dy}:${x + dx}`) ?? [])
					if (distanceM(at, v) <= radius) out.push(v);
		return out;
	}
}

/** How alike two names are, 0–1: trigram Dice of their aliases, or 0.9 when one holds the other. */
export const osmNameScore = (a: string, b: string, cityWords?: ReadonlySet<string>): number => {
	let best = 0;
	for (const x of venueAliases(a, cityWords))
		for (const y of venueAliases(b, cityWords)) {
			const [short, long] = x.length <= y.length ? [x, y] : [y, x];
			const contained =
				short.length >= MIN_CONTAINED_LENGTH && ` ${long} `.includes(` ${short} `) ?
					0.9
				:	0;
			best = Math.max(best, nameSimilarity(x, y), contained);
		}
	return best;
};

/**
 * The venue an OSM place is: within `OSM_MATCH_RADIUS_M` and named alike (`osmNameScore`), the
 * most alike first, then the nearest. Null when none is; a name that is only generic words
 * ("Café") never matches.
 */
export const matchOsmPlace = (
	place: { name: string; lat: number; lng: number },
	grid: VenueGrid,
	cityWords?: ReadonlySet<string>,
): string | null => {
	let best: { id: string; score: number; distance: number } | null = null;
	for (const v of grid.near(place)) {
		const score = osmNameScore(place.name, v.name, cityWords);
		if (score < OSM_NAME_SIMILARITY) continue;
		const distance = distanceM(place, v);
		if (!best || score > best.score || (score === best.score && distance < best.distance))
			best = { id: v.id, score, distance };
	}
	return best?.id ?? null;
};

/** What Google Maps is asked for an OSM place: its name and address, as a guest would type it. */
export const osmSearchString = (
	place: {
		name: string;
		street?: string | null;
		houseNumber?: string | null;
		postalCode?: string | null;
	},
	cityName: string,
): string => {
	const street =
		place.street ? [place.street, place.houseNumber].filter(Boolean).join(' ') : null;
	const town = [place.postalCode, cityName].filter(Boolean).join(' ');
	return [place.name, street, town].filter(Boolean).join(', ');
};

/**
 * The order unmatched places are looked up in when the budget can't cover them all: sit-down
 * places before quick food and shops (`KIND_ORDER`), and within a kind those OSM knows more of
 * (a website, opening hours: someone keeps them), then by key so reruns agree.
 */
export const osmLookupOrder = <
	T extends { kind: string; osmKey: string; tags: Record<string, string> },
>(
	places: T[],
): T[] => {
	const care = (p: T) =>
		(p.tags.website || p.tags['contact:website'] ? 0 : 1) + (p.tags.opening_hours ? 0 : 1);
	const kindRank = (p: T) => {
		const i = KIND_ORDER.indexOf(p.kind);
		return i < 0 ? KIND_ORDER.length : i;
	};
	return [...places].sort(
		(a, b) =>
			kindRank(a) - kindRank(b) || care(a) - care(b) || a.osmKey.localeCompare(b.osmKey),
	);
};
