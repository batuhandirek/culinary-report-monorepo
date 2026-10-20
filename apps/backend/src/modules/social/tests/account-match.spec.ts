import { describe, expect, it } from '@jest/globals';

import { SocialPlatformEnum } from '../entities/social-post.entity.js';
import {
	accountMatchIndex,
	type AccountMatchName,
	AccountMatchTier,
	handleForms,
	matchAccount,
} from '../util/account-match.js';
import { normalizeAccountHandle, profileOf } from '../util/accounts.js';
import { creatorKey } from '../util/creators.js';

// Berlin's words as `AccountMatchingService` passes them: stopwords, names and districts
const CITY_WORDS = ['berlin', 'Berlin', 'Mitte', 'Friedrichshain-Kreuzberg', 'Neukölln', 'Steglitz-Zehlendorf'];

// One-branch brands: the brand's name and its venue's, as the service indexes them
const solo = (id: string, name: string): AccountMatchName[] => [
	{ brandId: id, name },
	{ brandId: id, branchId: `v-${id}`, name },
];

// Names from the dev database (Berlin, 2026-10-19)
const NAMES: AccountMatchName[] = [
	...solo('sori', 'SORI Ramen Berlin'),
	...solo('markthalle', 'Markthalle Neun'),
	...solo('misspho', 'Miss Pho Restaurant'),
	...solo('salamat', 'Salamat'),
	...solo('9ja', '9JA Flavour'),
	...solo('huhner', 'Hühnerhaus36'),
	...solo('chenche', 'Chén Chè'),
	...solo('brucke', 'Imbiss Olympische Brücke'),
	...solo('drei', 'DREI.'),
	...solo('vegang', 'Vegang'),
	...solo('gnocchi', 'FOOD | Gnocchi Affair (New concept)'),
	...solo('cross', 'Coffee Cross'),
	...solo('christ', 'Cafe Christ'),
	...solo('ramen', 'Ramen'),
	...solo('midori', 'MIDORI'),
	...solo('slicebox', 'Slicebox Neukölln'),
	...solo('ribaltone', 'Osteria Ribaltone'),
	...solo('papapane', 'Papa Pane di Sorrento'),
	...solo('berlinburger', 'Berlinburger International'),
	// Two independents of one name: neither is linked on the name alone
	...solo('pizza-a', 'Pizza Napoli'),
	...solo('pizza-b', 'Pizza Napoli'),
	// A chain: the brand, and branches named after their place
	{ brandId: 'bm', name: 'Burgermeister' },
	{ brandId: 'bm', branchId: 'bm-kotti', name: 'Burgermeister Kottbusser Tor' },
	{ brandId: 'bm', branchId: 'bm-schlesi', name: 'Burgermeister Schlesisches Tor' },
	{ brandId: 'kb', name: 'Kotti Burger' },
	{ brandId: 'kb', branchId: 'kb-kotti', name: 'Kotti Burger' },
	{ brandId: 'kb', branchId: 'kb-wedding', name: 'Wedding Snack Bar' },
];

const index = accountMatchIndex(NAMES, CITY_WORDS);
const match = (handle: string, opts: { postedAbout?: string[]; rejected?: string[]; displayName?: string } = {}) =>
	matchAccount(
		{
			handle,
			displayName: opts.displayName,
			postedAbout: new Set(opts.postedAbout ?? []),
			rejected: new Set(opts.rejected ?? []),
		},
		index,
	);

describe('matchAccount', () => {
	it('links a handle that is the name once city words and venue words are off', () => {
		expect(match('soriramen.berlin')).toMatchObject({ brandId: 'sori', tier: AccountMatchTier.EXACT, link: true });
		expect(match('markthalleneun')).toMatchObject({ brandId: 'markthalle', link: true });
		expect(match('misspho.berlin')).toMatchObject({ brandId: 'misspho', link: true });
		expect(match('restaurant.salamat')).toMatchObject({ brandId: 'salamat', link: true });
		// Digits that are the name's own
		expect(match('9ja.flavour_')).toMatchObject({ brandId: '9ja', link: true });
		expect(match('huhnerhaus36')).toMatchObject({ brandId: 'huhner', link: true });
		// And one a handle adds
		expect(match('chenche_berlin.0')).toMatchObject({ brandId: 'chenche', link: true });
		// A district at the end
		expect(match('slicebox_neukoelln')).toMatchObject({ brandId: 'slicebox', link: true });
	});

	it('reads the three ways German handles spell an umlaut', () => {
		expect(match('olympischebruecke')).toMatchObject({ brandId: 'brucke', link: true });
		expect(match('olympischebrcke')).toMatchObject({ brandId: 'brucke', link: true });
	});

	it('links a short name only when the account posted about it', () => {
		expect(match('drei.berlin')).toMatchObject({ brandId: 'drei', link: false });
		expect(match('drei.berlin', { postedAbout: ['drei'] })).toMatchObject({ brandId: 'drei', link: true });
	});

	it('links a looser match only when the posts agree', () => {
		// The name on the handle's word breaks
		expect(match('east_of_midori')).toBeNull();
		expect(match('east_of_midori', { postedAbout: ['midori'] })).toMatchObject({
			brandId: 'midori',
			tier: AccountMatchTier.CONTAINS,
			link: true,
		});
		expect(match('berlin.burger.int', { postedAbout: ['berlinburger'] })).toMatchObject({ brandId: 'berlinburger', link: true });
		// The start of a longer name is offered to an admin
		expect(match('papa_pane')).toMatchObject({ brandId: 'papapane', link: false });
	});

	it('never takes a name off the handle’s word breaks, a common word or a kind of place', () => {
		expect(match('vegan.garden.berlin', { postedAbout: ['vegang'] })?.link).not.toBe(true);
		expect(match('foodgrrrl')).toBeNull();
		expect(match('crossfatberlin')).toBeNull();
		expect(match('christian.belt.official')).toBeNull();
		expect(match('christianandakitaeats')).toBeNull();
		// "Osteria" is no one's name
		expect(match('osteriamare', { postedAbout: ['ribaltone'] })?.link).not.toBe(true);
		// A name made of food words is no one's by itself
		expect(match('ramen.berlin')).toBeNull();
		expect(match('ramen.berlin', { postedAbout: ['ramen'] })).toMatchObject({ brandId: 'ramen' });
	});

	it('leaves two brands of one name to the posts, else to an admin', () => {
		expect(match('pizza.napoli.berlin')?.link).toBe(false);
		expect(match('pizza.napoli.berlin', { postedAbout: ['pizza-b'] })).toMatchObject({ brandId: 'pizza-b', link: true });
		expect(match('pizza.napoli.berlin', { postedAbout: ['pizza-a', 'pizza-b'] })?.link).toBe(false);
	});

	it("tells a chain's account from a branch's own", () => {
		// It holds the brand's name: the brand's
		expect(match('burgermeister.berlin')).toMatchObject({ brandId: 'bm', link: true });
		expect(match('burgermeister.berlin')?.branchId).toBeUndefined();
		// One branch's name only: that branch's
		expect(match('weddingsnackbar')).toMatchObject({ brandId: 'kb', branchId: 'kb-wedding', link: true });
		expect(match('kottiburger')).toMatchObject({ brandId: 'kb', link: true });
		expect(match('kottiburger')?.branchId).toBeUndefined();
	});

	it('never offers a brand an admin said it is not', () => {
		expect(match('soriramen.berlin', { rejected: ['sori'] })).toBeNull();
	});

	it("matches on the profile's display name too", () => {
		expect(match('bestnoodles_42', { displayName: 'SORI Ramen Berlin' })).toMatchObject({ brandId: 'sori', link: true });
	});
});

describe('handles', () => {
	it('strips city words and venue words off either end, one at a time', () => {
		const words = accountMatchIndex([], CITY_WORDS).cityWords;
		expect(handleForms('soriramen.berlin', words)).toEqual(expect.arrayContaining(['soriramenberlin', 'soriramen']));
		expect(handleForms('restaurant.salamat', words)).toEqual(expect.arrayContaining(['salamat']));
		expect(handleForms('thetastezehlendorf', words)).toEqual(expect.arrayContaining(['thetaste']));
	});

	it('normalizes handles and profile links', () => {
		expect(normalizeAccountHandle('@ChenChe_Berlin ')).toBe('chenche_berlin');
		expect(normalizeAccountHandle('https://www.instagram.com/chenche_berlin/')).toBe('chenche_berlin');
		expect(normalizeAccountHandle('not a handle')).toBeNull();
		expect(profileOf('https://www.instagram.com/arkadasch_bar_kaffee/?hl=de')).toEqual({
			platform: SocialPlatformEnum.INSTAGRAM,
			handle: 'arkadasch_bar_kaffee',
		});
		expect(profileOf('https://instagram.com/loveatfirstbite_berlin?igshid=YmMyMTA2M2Y=')).toMatchObject({
			handle: 'loveatfirstbite_berlin',
		});
		expect(profileOf('https://www.tiktok.com/@chenche.berlin')).toEqual({
			platform: SocialPlatformEnum.TIKTOK,
			handle: 'chenche.berlin',
		});
		// A post, a TikTok page that is no profile, another site
		expect(profileOf('https://www.instagram.com/p/C123abc/')).toBeNull();
		expect(profileOf('https://www.tiktok.com/discover/berlin-food')).toBeNull();
		expect(profileOf('https://chenche.de')).toBeNull();
	});

	it("keys a person's accounts by their letters", () => {
		expect(creatorKey('polina_iz_berlina')).toBe(creatorKey('polina.iz.berlina'));
		expect(creatorKey('a.b')).toBeNull();
	});
});
