import { describe, expect, it } from '@jest/globals';

import {
	cityStopwords,
	isFoodVenue,
	isInCity,
	isSameVenue,
	nameSimilarity,
	normalizeVenueName,
	venueAliases,
} from '../util/venue-names.js';

describe('venue names', () => {
	it("drops accents, punctuation, generic words and the city's own", () => {
		const berlin = cityStopwords(['Berlin']);
		expect(normalizeVenueName('Café Ölmühle – Bar & Grill Berlin', berlin)).toBe('olmuhle');
		expect(normalizeVenueName('Café Ölmühle – Bar & Grill Berlin')).toBe('olmuhle berlin');
		expect(normalizeVenueName('Lokanta Çiya İstanbul', cityStopwords(['istanbul', 'lokanta']))).toBe('ciya');
		expect(normalizeVenueName('Hühnerhaus36')).toBe('huhnerhaus36');
	});

	it('also matches a Google name by what comes before its slogan', () => {
		expect(venueAliases('Chen Che - Teehaus | Berlin-Mitte')).toContain('chen che');
	});

	it('scores identical names 1 and different ones low', () => {
		expect(nameSimilarity('nefis gemuse kebap', 'nefis gemuse kebap')).toBe(1);
		expect(nameSimilarity('doner pro', 'doner montes claros')).toBeLessThan(0.6);
	});

	it("treats a mention without a city as in the city, and knows the city's aliases", () => {
		expect(isInCity(null, ['Berlin'])).toBe(true);
		expect(isInCity('Berlin, Germany', ['Berlin'])).toBe(true);
		expect(isInCity('London', ['Berlin'])).toBe(false);
		expect(isInCity('Munich', ['München', 'Munich'])).toBe(true);
		expect(isInCity('Muenchen', ['München'])).toBe(false);
	});

	it('knows food and drink categories', () => {
		expect(isFoodVenue('Vietnamese restaurant')).toBe(true);
		expect(isFoodVenue('Cocktail bar')).toBe(true);
		expect(isFoodVenue('Typing service')).toBe(false);
		expect(isFoodVenue(null)).toBe(true);
	});

	it('refuses a namesake place on another platform', () => {
		expect(isSameVenue('Olympische Brücke', 'Imbiss Olympische Brücke')).toBe(true);
		expect(isSameVenue('Berlin Döner Montes Claros', 'Döner Pro')).toBe(false);
		expect(isSameVenue('Berlin', 'Steakhouse Hazienda')).toBe(false);
	});
});
