import { describe, expect, it } from '@jest/globals';

import {
	LIEFERANDO_BUN_SOCIETY,
	UBER_EATS_BUN_SOCIETY,
} from 'src/modules/venues/tests/fixtures/delivery-items.js';
import { lieferandoPage, uberEatsPage } from 'src/modules/venues/util/delivery-pages.js';
import { termKey } from 'src/modules/venues/util/dishes.js';

import { matchMenuItem } from '../util/menu-terms.js';

// The Bun Society's menus as read on 2026-11-14, and wordings its reviews and posts used
const lieferando = lieferandoPage(LIEFERANDO_BUN_SOCIETY)!.items.map((item, i) => ({ id: i + 1, key: item.key, name: item.name }));
const uberEats = uberEatsPage(UBER_EATS_BUN_SOCIETY)!.items.map((item, i) => ({ id: i + 1, key: item.key, name: item.name }));

const on = (menu: typeof lieferando, wording: string) => {
	const hit = matchMenuItem(termKey(wording), menu);
	return hit ? [menu.find(i => i.id === hit.item.id)!.name, hit.method] : null;
};

describe('matchMenuItem', () => {
	it('links a wording that is the item’s name, whatever its spelling', () => {
		expect(on(lieferando, 'Banging Bangkok')).toEqual(['Banging Bangkok', 'exact']);
		expect(on(lieferando, 'Bussin Bulgogi')).toEqual(["Bussin' Bulgogi", 'exact']);
		expect(on(uberEats, 'banging bangkok')).toEqual(['Banging Bangkok 🌶️🌶️', 'exact']);
		expect(on(lieferando, 'kimchi')).toEqual(['Kimchi', 'exact']);
		// The menu's article is no part of the name, nor is the order of the words
		expect(on(lieferando, 'classic smash')).toEqual(['The Classic Smash', 'exact']);
		expect(on(lieferando, 'Sando Midnight')).toEqual(['Midnight Sando', 'exact']);
	});

	it('links a wording that holds an item’s name, or is held by one item’s', () => {
		expect(on(lieferando, 'banging bangkok burger')).toEqual(['Banging Bangkok', 'contains']);
		expect(on(lieferando, 'Plantain Wahala Burger')).toEqual(['Plantain Wahala', 'contains']);
		// The longest name the wording holds: the veggie one, not the plain one
		expect(on(lieferando, 'the banging bangkok veggie burger')).toEqual(['Banging Bangkok Veggie', 'contains']);
		// Held by an item and its variants: the plain one is meant
		expect(on(lieferando, 'basil mayo')).toEqual(['Thai Basil Mayo', 'contains']);
	});

	it('links a close spelling of one item', () => {
		expect(on(lieferando, 'Bangbang Bangkok')).toEqual(['Banging Bangkok', 'similar']);
		expect(on(lieferando, 'Gochu chicken')).toEqual(['Gochu Chick', 'similar']);
		// Uber Eats lists it misspelled
		expect(on(uberEats, 'Plantain Wahala')).toEqual(['Platain Wahala', 'similar']);
	});

	it('leaves a wording that names a kind of food, several items or none', () => {
		expect(on(lieferando, 'burger')).toBeNull();
		expect(on(lieferando, 'fries')).toBeNull();
		expect(on(lieferando, 'Korean burgers')).toBeNull();
		expect(on(lieferando, 'chicken burger')).toBeNull();
		// "Bussin' Bulgogi" or "Bulgogi Mayo"
		expect(on(lieferando, 'bulgogi')).toBeNull();
		// Not on the menu any more
		expect(on(lieferando, 'El Toro Bravo')).toBeNull();
		expect(on(lieferando, '')).toBeNull();
	});
});
