import { describe, expect, it } from '@jest/globals';

import {
	distanceM,
	matchOsmPlace,
	osmLookupOrder,
	osmNameScore,
	osmPlaceFields,
	osmSearchString,
	overpassFoodQuery,
	VenueGrid,
} from '../util/osm-places.js';
import { cityStopwords } from '../util/venue-names.js';

// Wittenbergplatz, Berlin
const AT = { lat: 52.5019, lng: 13.3426 };
// About `m` metres north of AT
const north = (m: number) => ({ lat: AT.lat + m / 110_574, lng: AT.lng });
const words = cityStopwords(['berlin']);

describe('overpassFoodQuery', () => {
	it("asks for the food amenities and shops inside the relation's area", () => {
		const q = overpassFoodQuery(62422, 120);
		expect(q).toContain('[timeout:120]');
		expect(q).toContain('area(id:3600062422)');
		expect(q).toContain(
			'"amenity"~"^(restaurant|cafe|bar|pub|biergarten|fast_food|ice_cream|food_court)$"',
		);
		expect(q).toContain('"shop"~"^(bakery|pastry|confectionery)$"');
		expect(q).toContain('out center tags;');
	});
});

describe('osmPlaceFields', () => {
	it('reads a node and a way, as Overpass returns them', () => {
		expect(
			osmPlaceFields({
				type: 'node',
				id: 1,
				lat: 52.5,
				lon: 13.34,
				tags: {
					amenity: 'restaurant',
					name: 'Faustus ',
					'addr:street': 'Wittenbergplatz',
					'addr:housenumber': '5',
					'addr:postcode': '10789',
					cuisine: 'german',
				},
			}),
		).toEqual({
			osmKey: 'node/1',
			name: 'Faustus',
			kind: 'restaurant',
			lat: 52.5,
			lng: 13.34,
			street: 'Wittenbergplatz',
			houseNumber: '5',
			postalCode: '10789',
			tags: expect.objectContaining({ cuisine: 'german' }),
		});
		expect(
			osmPlaceFields({
				type: 'way',
				id: 2,
				center: { lat: 52.4, lon: 13.3 },
				tags: { shop: 'bakery', name: 'Bäckerei Siebert' },
			}),
		).toMatchObject({ osmKey: 'way/2', kind: 'bakery', lat: 52.4, lng: 13.3, street: null });
	});

	it('skips an element without a name, a food tag or a position', () => {
		expect(
			osmPlaceFields({ type: 'node', id: 3, lat: 1, lon: 1, tags: { amenity: 'cafe' } }),
		).toBeNull();
		// Overpass returned a public bookcase tagged with a food shop value elsewhere: not a food tag
		expect(
			osmPlaceFields({
				type: 'node',
				id: 4,
				lat: 1,
				lon: 1,
				tags: { amenity: 'public_bookcase', name: 'X' },
			}),
		).toBeNull();
		expect(
			osmPlaceFields({ type: 'relation', id: 5, tags: { amenity: 'cafe', name: 'Y' } }),
		).toBeNull();
	});
});

describe('distanceM', () => {
	it('measures metres within a city', () => {
		expect(Math.round(distanceM(AT, north(100)))).toBe(100);
		expect(Math.round(distanceM(AT, { lat: AT.lat, lng: AT.lng + 0.001 }))).toBe(68);
	});
});

describe('osmNameScore', () => {
	it('scores spellings alike, a held name high, and generic words not at all', () => {
		expect(osmNameScore('Eastmoon', 'East Moon', words)).toBeGreaterThanOrEqual(0.6);
		expect(
			osmNameScore('Chinarestaurant Hey Cheuk Lau', 'China-Restaurant Hey Cheuk Lau', words),
		).toBeGreaterThanOrEqual(0.6);
		expect(osmNameScore('Baba Pirzola', 'Baba Pirzola Restaurant Berlin', words)).toBe(1);
		expect(
			osmNameScore('Poco Loco', 'PocoLoco 4 | Cantina Mexicana & Cocktailbar | Karow', words),
		).toBeGreaterThanOrEqual(0.6);
		// A short word inside another name says nothing
		expect(osmNameScore('Asia', 'Asia Gourmet Haus', words)).toBeLessThan(0.6);
		expect(osmNameScore('Café', 'Café', words)).toBe(0);
	});
});

describe('matchOsmPlace', () => {
	const grid = new VenueGrid([
		{ id: 'baba', name: 'Baba Pirzola', ...north(20) },
		{ id: 'other', name: 'Pizza Roma', ...north(5) },
		{ id: 'far', name: 'Faustus', ...north(400) },
		{ id: 'cafe', name: 'Cafe', ...north(1) },
	]);

	it('links a place to the venue near it with a name alike', () => {
		expect(matchOsmPlace({ name: 'Baba Pirzola', ...AT }, grid, words)).toBe('baba');
	});

	it('links nothing beyond the radius, to a different name or on generic words', () => {
		expect(matchOsmPlace({ name: 'Faustus', ...AT }, grid, words)).toBeNull();
		expect(matchOsmPlace({ name: 'Döner Haus', ...AT }, grid, words)).toBeNull();
		expect(matchOsmPlace({ name: 'Café', ...AT }, grid, words)).toBeNull();
	});

	it('takes the most alike, then the nearest', () => {
		const twins = new VenueGrid([
			{ id: 'near', name: 'Roma', ...north(10) },
			{ id: 'nearer', name: 'Roma', ...north(2) },
			{ id: 'exact', name: 'Pizza Roma', ...north(100) },
		]);
		expect(matchOsmPlace({ name: 'Pizza Roma', ...AT }, twins, words)).toBe('exact');
		expect(matchOsmPlace({ name: 'Roma', ...AT }, twins, words)).toBe('nearer');
	});
});

describe('osmSearchString', () => {
	it('types the name, the address and the town', () => {
		expect(
			osmSearchString(
				{
					name: 'Faustus',
					street: 'Wittenbergplatz',
					houseNumber: '5',
					postalCode: '10789',
				},
				'Berlin',
			),
		).toBe('Faustus, Wittenbergplatz 5, 10789 Berlin');
		expect(osmSearchString({ name: 'Baba Pirzola' }, 'Berlin')).toBe('Baba Pirzola, Berlin');
		expect(
			osmSearchString({ name: 'X', street: 'Torstraße', houseNumber: null }, 'Berlin'),
		).toBe('X, Torstraße, Berlin');
	});
});

describe('osmLookupOrder', () => {
	it('puts sit-down places first, then those OSM keeps up, then by key', () => {
		const p = (osmKey: string, kind: string, tags: Record<string, string> = {}) => ({
			osmKey,
			kind,
			tags,
		});
		expect(
			osmLookupOrder([
				p('node/1', 'bakery', { website: 'x' }),
				p('node/2', 'fast_food'),
				p('node/4', 'restaurant'),
				p('node/3', 'restaurant'),
				p('node/5', 'restaurant', { website: 'x', opening_hours: 'Mo-Su' }),
				p('node/6', 'cafe'),
			]).map(x => x.osmKey),
		).toEqual(['node/5', 'node/3', 'node/4', 'node/6', 'node/2', 'node/1']);
	});
});
