import { describe, expect, it } from '@jest/globals';

import {
	brandHead,
	brandKey,
	busiestBranch,
	isBrandName,
	isProfileKey,
	oneBrandSite,
	ownSite,
	registrableDomain,
	siteNamedAfter,
	suggestBrands,
	venueSearchName,
} from '../util/brands.js';
import { cityStopwords } from '../util/venue-names.js';

const berlin = cityStopwords(['berlin']);

describe('brandKey', () => {
	it('drops what follows the brand: a branch in parentheses, a slogan, the city', () => {
		expect(brandHead("Brammibal's Donuts (Prenzlauer Berg)")).toBe("Brammibal's Donuts");
		expect(brandKey("Brammibal's Donuts (Prenzlauer Berg)")).toBe('brammibal s donuts');
		expect(brandKey('Mmaah! - Korean Fried Chicken & Korean BBQ')).toBe('mmaah');
		expect(brandKey('Burger Route Berlin', berlin)).toBe('burger route');
	});
});

describe('isBrandName', () => {
	it('takes the same key, or the key followed by more words', () => {
		expect(isBrandName('Burgermeister Kottbusser Tor', 'burgermeister', berlin)).toBe(true);
		expect(isBrandName("Brammibal's Donuts (Maybachufer)", 'brammibal s donuts', berlin)).toBe(
			true,
		);
		expect(isBrandName('Burgermeister Berlin', 'burgermeister', berlin)).toBe(true);
	});

	it('refuses look-alikes, and a short key extended by other words', () => {
		expect(isBrandName("Golt'z Burger", 'burgermeister', berlin)).toBe(false);
		expect(isBrandName('Peter Pane', 'burgermeister', berlin)).toBe(false);
		expect(isBrandName('Burger Vision', 'burger', berlin)).toBe(false);
		expect(isBrandName('Curry Baude', 'curry', berlin)).toBe(false);
		expect(isBrandName('Curry', 'curry', berlin)).toBe(true);
		// Two words may be extended, however short
		expect(isBrandName('Curry 36 Mitte', 'curry 36', berlin)).toBe(true);
	});
});

describe('venueSearchName', () => {
	it("searches a branch by its brand's name", () => {
		expect(
			venueSearchName({
				name: "Brammibal's Donuts (Maybachufer)",
				brand: { name: "Brammibal's Donuts" },
			}),
		).toBe("Brammibal's Donuts");
		expect(venueSearchName({ name: 'Hisar', brand: null })).toBe('Hisar');
	});
});

describe('busiestBranch', () => {
	it('is the branch with the most Google reviews, then the lowest id', () => {
		expect(
			busiestBranch([
				{ id: 'b', reviewsCount: 10 },
				{ id: 'a', reviewsCount: 3000 },
			])?.id,
		).toBe('a');
		expect(
			busiestBranch([
				{ id: 'b', reviewsCount: 5 },
				{ id: 'a', reviewsCount: 5 },
			])?.id,
		).toBe('a');
		expect(busiestBranch([{ id: 'a' }, { id: 'b', reviewsCount: 1 }])?.id).toBe('b');
	});
});

describe('suggestBrands', () => {
	const v = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
		id,
		name,
		category: 'Restaurant',
		...extra,
	});

	it('groups the same name, a suffixed branch and a name prefix, shorter keys first', () => {
		const groups = suggestBrands(
			[
				v('1', "Brammibal's Donuts", { category: 'Donut shop' }),
				v('2', "Brammibal's Donuts (Prenzlauer Berg)", { category: 'Donut shop' }),
				v('3', 'Burgermeister'),
				v('4', 'Burgermeister Leopoldplatz'),
				v('5', 'Burgermeister Schlesisches Tor'),
				v('6', 'Peter Pane'),
				v('7', 'Nhas City Chicken'),
			],
			berlin,
			new Set(),
		);
		expect(groups).toEqual([
			{
				key: 'burgermeister',
				name: 'Burgermeister',
				venueIds: ['3', '4', '5'],
				reason: 'name prefix',
			},
			{
				key: 'brammibal s donuts',
				name: "Brammibal's Donuts",
				venueIds: ['1', '2'],
				reason: 'same name',
			},
		]);
	});

	it('groups own-named branches on one website, and names the group by the shared words', () => {
		const groups = suggestBrands(
			[
				v('1', 'Burgermeister Zoo', { website: 'https://burgermeister.com/' }),
				v('2', 'Burgermeister Mehringdamm', { website: 'http://www.burgermeister.com/' }),
				// Same website, another first word: not grouped
				v('3', 'Golden Burger', { website: 'https://burgermeister.com/' }),
				// One Instagram profile is one website; a platform's page is none
				v('4', 'Hisar Express', { website: 'https://instagram.com/hisar.berlin' }),
				v('5', 'Hisar Kiosk', { website: 'https://www.instagram.com/hisar.berlin/?hl=de' }),
				v('6', 'Mangal Express', { website: 'https://www.lieferando.de/mangal' }),
				v('7', 'Mangal Kiosk', { website: 'https://www.lieferando.de/mangal' }),
			],
			berlin,
			new Set(),
		);
		expect(groups).toEqual([
			{
				key: 'burgermeister',
				name: 'Burgermeister',
				venueIds: ['1', '2'],
				reason: 'same website',
			},
			{ key: 'hisar', name: 'Hisar', venueIds: ['4', '5'], reason: 'same Instagram' },
		]);
	});

	it('groups names sharing no words on one Instagram or TikTok profile, keyed by the profile', () => {
		const groups = suggestBrands(
			[
				v('1', 'Kinza', { website: 'https://www.instagram.com/kinza.berlin/' }),
				v('2', 'Taste of Japan', { website: 'https://instagram.com/kinza.berlin?igsh=abc' }),
				v('3', 'Noodle Town', { website: 'https://www.tiktok.com/@thenoodletown' }),
				v('4', 'Hanoi Kitchen', { website: 'https://tiktok.com/@thenoodletown/' }),
				// A TikTok page without the @ is no profile; a Lieferando page is no one's own
				v('5', 'Mangal Express', { website: 'https://www.lieferando.de/mangal' }),
				v('6', 'Imren Grill', { website: 'https://www.lieferando.de/mangal' }),
				v('7', 'Pho Haus', { website: 'https://www.tiktok.com/discover/pho' }),
				v('8', 'Bun Cha', { website: 'https://www.tiktok.com/discover/pho' }),
			],
			berlin,
			new Set(),
		);
		expect(groups).toEqual([
			{
				key: 'instagram:kinza.berlin',
				name: 'Kinza',
				venueIds: ['1', '2'],
				reason: 'same Instagram',
			},
			{
				key: 'tiktok:thenoodletown',
				name: 'Noodle Town',
				venueIds: ['3', '4'],
				reason: 'same TikTok',
			},
		]);
		expect(groups.map(g => isProfileKey(g.key))).toEqual([true, true]);
		expect(isProfileKey('hisar')).toBe(false);
		// A dismissal is keyed by the profile and sticks
		expect(
			suggestBrands(
				[
					v('1', 'Kinza', { website: 'https://www.instagram.com/kinza.berlin/' }),
					v('2', 'Taste of Japan', { website: 'https://instagram.com/kinza.berlin' }),
				],
				berlin,
				new Set(['instagram:kinza.berlin']),
			),
		).toEqual([]);
	});

	it('gives a key one group: a website group joins the name group with its key', () => {
		const groups = suggestBrands(
			[
				v('1', 'goldies', { website: 'http://www.goldies-smashburger.de/' }),
				v('2', 'goldies', { website: 'https://www.goldies-smashburger.de/' }),
				v('3', 'goldies chicken & smashburger', {
					website: 'https://www.goldies-smashburger.de/',
				}),
				v('4', 'goldies smashburger', { website: 'https://www.goldies-smashburger.de/' }),
				// Two websites whose branches share only their first word
				v('5', 'Bäckerei Mitte', { website: 'https://a-backstube.de/' }),
				v('6', 'Bäckerei Zoo', { website: 'https://a-backstube.de/' }),
				v('7', 'Bäckerei Kotti', { website: 'https://b-backstube.de/' }),
				v('8', 'Bäckerei Wedding', { website: 'https://b-backstube.de/' }),
			],
			berlin,
			new Set(),
		);
		expect(groups.map(g => [g.key, g.venueIds])).toEqual([
			['backerei', ['5', '6', '7', '8']],
			['goldies', ['1', '2', '3', '4']],
		]);
	});

	it('never lets a common word take in longer names: one that stands inside other names', () => {
		const groups = suggestBrands(
			[
				v('1', 'Bäckerei Sofra'),
				v('2', 'Bäckerei Exner'),
				v('3', 'Bäckerei'),
				v('4', 'Cafe & Bäckerei Olive'),
				v('5', 'Konditorei Bäckerei Wahl'),
			],
			berlin,
			new Set(),
		);
		expect(groups).toEqual([]);
	});

	it('leaves out known keys, closed and non-food places, and venues without a partner', () => {
		const groups = suggestBrands(
			[
				v('1', 'Burgermeister'),
				v('2', 'Burgermeister Zoo'),
				v('3', 'Curry 36'),
				v('4', 'Curry 36', { closed: true }),
				v('5', 'Burgermeister Produktion', { category: 'Grocery store' }),
				v('6', 'Hisar'),
			],
			berlin,
			new Set(['burgermeister']),
		);
		expect(groups).toEqual([]);
	});
});

describe('own sites', () => {
	it('reads a website as the domain it is registered under, or a profile', () => {
		expect(registrableDomain('pberg.benedict.world')).toBe('benedict.world');
		expect(registrableDomain('shop.example.co.uk')).toBe('example.co.uk');
		expect(ownSite('https://pberg.benedict.world/menu', 'Benedict', berlin)).toEqual({
			site: 'benedict.world',
			kind: 'domain',
			token: 'benedict',
			named: true,
		});
		expect(
			ownSite('https://www.instagram.com/kaffee_buro/?hl=de', 'Kaffee Büro', berlin),
		).toMatchObject({
			site: 'instagram:kaffee_buro',
			named: true,
		});
		// A shared host names the venue by its own part
		expect(ownSite('https://veracruz-berlin.eatbu.com/', 'Veracruz', berlin)).toMatchObject({
			site: 'veracruz-berlin.eatbu.com',
			named: true,
		});
		// Platform pages are no site of the venue's
		expect(
			ownSite('https://www.lieferando.de/speisekarte/goldies', 'goldies', berlin),
		).toBeNull();
		expect(ownSite(null, 'goldies', berlin)).toBeNull();
	});

	it("knows a site named after the brand from a listing or another place's site", () => {
		expect(
			siteNamedAfter('lily-burger.de', 'Lily Burger "Beef & Vegan Grill-Club“', berlin),
		).toBe(true);
		expect(siteNamedAfter('losteria.net', "L'Osteria", berlin)).toBe(true);
		expect(siteNamedAfter('lap.coffee', 'LAP COFFEE', berlin)).toBe(true);
		expect(siteNamedAfter('hansimglueck-burgergrill.de', 'HANS IM GLÜCK', berlin)).toBe(true);
		expect(siteNamedAfter('oggiskebab.de', "Oggi's Gemüsekebab", berlin)).toBe(true);
		expect(siteNamedAfter('nilakitchen.de', 'NILA South Indian', berlin)).toBe(true);
		expect(siteNamedAfter('hokey-pokey.de', 'Eispatisserie Hokey Pokey', berlin)).toBe(true);
		expect(siteNamedAfter('loveatfirstbite_berlin', 'Love at first bite', berlin)).toBe(true);
		// Listing and delivery sites, and a word for food, name nobody
		expect(siteNamedAfter('speisekartenweb.de', "Crispy's Chicken Berlin", berlin)).toBe(false);
		expect(siteNamedAfter('kuchi.de', 'Cocolo Ramen', berlin)).toBe(false);
		expect(siteNamedAfter('pizza.de', 'Pizza', berlin)).toBe(false);
	});

	it('takes one site named after the brand, given twice, as proof of one brand', () => {
		const at = (...websites: (string | null)[]) => websites.map(website => ({ website }));
		expect(
			oneBrandSite(
				at('https://lily-burger.de/', 'http://www.lily-burger.de/x'),
				'Lily Burger',
				berlin,
			),
		).toBe('lily-burger.de');
		// Without a site goes along with a distinctive name
		expect(
			oneBrandSite(
				at('https://pizzahut.de/', 'https://pizzahut.de/', null),
				'Pizza Hut',
				berlin,
			),
		).toBe('pizzahut.de');
		// A domain and a profile of the same letters; a profile named after the brand next to its domain
		expect(
			oneBrandSite(
				at('https://sweetjamaicafood.de/', 'https://instagram.com/sweetjamaicafood'),
				'Sweet Jamaica',
				berlin,
			),
		).toBe('sweetjamaicafood.de');
		expect(
			oneBrandSite(
				at(
					'https://fedora-eismanufaktur.de/',
					'https://fedora-eismanufaktur.de/',
					'https://instagram.com/fedora_berlin',
				),
				'Fedora Eismanufaktur',
				berlin,
			),
		).toBe('fedora-eismanufaktur.de');
		// The same name on another ending is one site; another spelling is another site
		expect(
			oneBrandSite(
				at('https://yumchaheroes.com/', 'https://yumchaheroes.de/'),
				'Yumcha Heroes',
				berlin,
			),
		).toBe('yumchaheroes.com');
		expect(
			oneBrandSite(
				at('https://ristoranteromaberlin.de/', 'https://ristoranteroma-berlin.de/'),
				'Roma',
				berlin,
			),
		).toBeNull();
		// One site only, two sites, a listing site, no site, or a generic name with a place without one
		expect(oneBrandSite(at('https://lyfe-superfood.de/', null), 'LYFE', berlin)).toBeNull();
		expect(
			oneBrandSite(
				at('https://fukagawa.de/', 'https://fukagawa-finedining.de/'),
				'Fukagawa',
				berlin,
			),
		).toBeNull();
		expect(
			oneBrandSite(
				at('https://speisekartenweb.de/a', 'https://speisekartenweb.de/b'),
				'Restaurant La',
				berlin,
			),
		).toBeNull();
		expect(oneBrandSite(at(null, null), 'Roma', berlin)).toBeNull();
		expect(
			oneBrandSite(
				at('https://asia-haus-berlin.de/', 'https://asia-haus-berlin.de/', null),
				'Asia Haus',
				berlin,
			),
		).toBeNull();
	});
});
