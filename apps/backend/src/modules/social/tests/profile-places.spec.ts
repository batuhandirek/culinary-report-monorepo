import { captionHandles } from '../util/accounts.js';
import {
	bioAddresses,
	placesAreOneBusiness,
	profilePlaceIndex,
	profilePlaces,
	type ProfilePlaceVenue,
	profileSearchName,
	textNamesAddress,
} from '../util/profile-places.js';

// Bios as `apify/instagram-profile-scraper` returned them on 2026-11-05
const LUCYS_BIO =
	'Let food define your health🥬\n🌱Torstraße 116\nMO-FR: 9-4 | SA/SUN: 10-5\n🌱Brunnenstraße 24\nMO-FR: 8-2.30 SA/SUN: 9-2.30\nBook @ TOR via the LINK below';
const SELO_BIO =
	'coffee•aperitif•community\nfamily-run coffee shop | card only\nTempelhofer Damm 212, 12099 Berlin 📍';
const SWAY_BIO = 'Wed-Sat: 18-00h \nHappy hour 18-20h ~ Food til late\n * no reservations *';

const cityWords = new Set(['berlin']);

const venue = (
	v: Partial<ProfilePlaceVenue> & Pick<ProfilePlaceVenue, 'id' | 'name'>,
): ProfilePlaceVenue => ({
	brandId: `brand-${v.id}`,
	brandName: v.name,
	street: null,
	website: null,
	...v,
});

// Dev Berlin's two Lucy's places, a stranger on the same street, and The Klub Kitchen
const VENUES = [
	venue({ id: 'lucy-deli', name: 'Lucy’s The Deli', street: 'Torstraße 116' }),
	venue({
		id: 'lucy-brunnen',
		name: "Lucy's. A healthy Deli Concept.",
		street: 'Brunnenstraße 24',
		website: 'https://instagram.com/lucys.berlin?igshid=YmMyMTA2M2Y=',
	}),
	venue({ id: 'neighbour', name: 'Torstraße Döner', street: 'Torstraße 116' }),
	venue({
		id: 'klub-kreuzberg',
		name: 'The Klub Kitchen',
		street: 'Almstadtstraße 9-11',
		website: 'https://www.theklubkitchen.com/',
	}),
	venue({
		id: 'klub-west',
		name: 'The Klub Kitchen West',
		street: 'Uhlandstraße 175',
		website: 'https://theklubkitchen.com',
	}),
];

describe('textNamesAddress', () => {
	it('needs the street and its house number', () => {
		expect(textNamesAddress(LUCYS_BIO, 'Torstraße 116')).toBe(true);
		expect(textNamesAddress('Torstr. 116-118', 'Torstraße 116')).toBe(true);
		expect(textNamesAddress('Torstraße 12', 'Torstraße 116')).toBe(false);
		expect(textNamesAddress('Torstraße 1160', 'Torstraße 116')).toBe(false);
		expect(textNamesAddress('Kufsteiner Straße 1', 'Kufsteiner Str. 1')).toBe(true);
	});

	it('takes a street stored without a number by the street alone', () => {
		expect(textNamesAddress('on Torstraße', 'Torstraße')).toBe(true);
	});
});

describe('profilePlaces', () => {
	const index = profilePlaceIndex(VENUES);

	it("finds both of Lucy's places from its bio, and not the stranger at the same address", () => {
		const places = profilePlaces(
			{ handle: 'lucys.berlin', displayName: 'Lucy‘s', bio: LUCYS_BIO },
			index,
			cityWords,
		);
		expect(places.map(p => [p.venueId, p.proof]).sort()).toEqual([
			['lucy-brunnen', 'street'],
			['lucy-deli', 'street'],
		]);
	});

	it('finds places by the website the profile links, named after them', () => {
		const places = profilePlaces(
			{
				handle: 'theklubkitchen',
				displayName: 'THE KLUB KITCHEN',
				bio: 'BERLIN | HAMBURG | MÜNCHEN',
				links: ['https://www.theklubkitchen.com'],
			},
			index,
			cityWords,
		);
		expect(places.map(p => [p.venueId, p.proof]).sort()).toEqual([
			['klub-kreuzberg', 'site'],
			['klub-west', 'site'],
		]);
	});

	it('takes no place from an address alone: a creator naming a favourite spot', () => {
		expect(
			profilePlaces(
				{ handle: 'mad_aboutmarie', bio: 'Food lover · fav lunch Torstraße 116' },
				index,
				cityWords,
			),
		).toEqual([]);
	});

	it('takes no place from a platform link (a booking page)', () => {
		expect(
			profilePlaces(
				{
					handle: 'lucys.berlin',
					links: ['https://bookings.zenchef.com/results?rid=365935&pid=1001'],
				},
				index,
				cityWords,
			),
		).toEqual([]);
	});
});

describe('bioAddresses', () => {
	it('reads addresses with their postcode', () => {
		expect(bioAddresses(SELO_BIO)).toEqual(['Tempelhofer Damm 212, 12099']);
		expect(bioAddresses(LUCYS_BIO)).toEqual(['Torstraße 116', 'Brunnenstraße 24']);
		expect(bioAddresses('Kufsteiner Str. 1 · Schöneberg')).toEqual(['Kufsteiner Str. 1']);
	});

	it('reads no address from hours or a lone street word', () => {
		expect(bioAddresses(SWAY_BIO)).toEqual([]);
		expect(bioAddresses('am Damm 3')).toEqual([]);
	});
});

describe('profileSearchName', () => {
	it('is the display name before any slogan, with the bio address', () => {
		expect(
			profileSearchName({
				handle: 'selocoffeeberlin',
				displayName: 'SELO COFFEE',
				bio: SELO_BIO,
			}),
		).toBe('SELO COFFEE Tempelhofer Damm 212, 12099');
		expect(
			profileSearchName({
				handle: 'magicbitteberlin',
				displayName: 'MAGIC BITTE  |  Berlin Coffee Studio™',
			}),
		).toBe('MAGIC BITTE');
		expect(profileSearchName({ handle: 'bar____sway' })).toBe('bar sway');
	});
});

describe('placesAreOneBusiness', () => {
	it("joins a business's places of one name", () => {
		expect(
			placesAreOneBusiness(
				{ isBusiness: true },
				['Lucy’s The Deli', "Lucy's. A healthy Deli Concept."],
				cityWords,
			),
		).toBe(true);
		expect(
			placesAreOneBusiness(
				{ isBusiness: true },
				['The Klub Kitchen', 'The Klub Kitchen West'],
				cityWords,
			),
		).toBe(true);
	});

	it('joins nothing for a creator, a person or an unknown account', () => {
		const names = ['Lucy’s The Deli', "Lucy's. A healthy Deli Concept."];
		expect(placesAreOneBusiness({ isBusiness: false }, names, cityWords)).toBe(false);
		expect(placesAreOneBusiness({ isBusiness: null }, names, cityWords)).toBe(false);
	});

	it('joins nothing when the places have different names, or a bio lists more than three', () => {
		expect(
			placesAreOneBusiness(
				{ isBusiness: true },
				['Lucy’s The Deli', 'Selo Coffee'],
				cityWords,
			),
		).toBe(false);
		expect(
			placesAreOneBusiness(
				{ isBusiness: true },
				['Bao Bao Mitte', 'Bao Bao Kreuzberg', 'Bao Bao Wedding', 'Bao Bao Pankow'],
				cityWords,
			),
		).toBe(false);
	});
});

describe('captionHandles', () => {
	it('drops a token glued to a hyphen whole, never cut to someone else’s handle', () => {
		expect(
			captionHandles('Reservieren: @aiko-sushi.de · by @haelibo and @lucys.berlin.'),
		).toEqual(['haelibo', 'lucys.berlin']);
		expect(captionHandles('@Choc-Spot , Rosenthaler Platz')).toEqual([]);
	});

	it('reads no handle from an e-mail address, and one handle once', () => {
		expect(captionHandles('info@lucys.de · @Lucys.Berlin @lucys.berlin')).toEqual([
			'lucys.berlin',
		]);
	});
});
