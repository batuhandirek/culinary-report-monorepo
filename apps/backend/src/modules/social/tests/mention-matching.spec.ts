import { describe, expect, it } from '@jest/globals';

import { venueAliases } from 'src/modules/venues/util/venue-names.js';

import { autoMatch, rankCandidates } from '../services/mention-matching.service.js';

const venue = (id: string, name: string, district: string | null = null) => ({
	id,
	name,
	category: 'Restaurant',
	district,
	street: null,
	aliases: venueAliases(name),
	// A brand of its own: a plain candidate, its branch always known
	brandId: `b-${id}`,
	brandName: name,
	branchCount: 1,
});

const VENUES = [
	venue('hisar', 'Hisar fresh food', 'Friedrichshain-Kreuzberg'),
	venue('nefis', 'Nefis Gemüse Kebap Kotti', 'Friedrichshain-Kreuzberg'),
	venue('nhas', 'Nhas City Chicken', 'Mitte'),
	venue('typing', 'Familienbetrieb'),
];

describe('mention matching', () => {
	it('accepts an exact name without asking the LLM', () => {
		const candidates = rankCandidates({ venueName: 'Hisar Fresh Food', locationHint: null }, null, VENUES);
		expect(autoMatch(candidates)?.id).toBe('hisar');
		expect(candidates[0]).toMatchObject({ raw: 1, brandId: 'b-hisar', branchKnown: true });
	});

	it('lifts the place the creator tagged', () => {
		const candidates = rankCandidates(
			{ venueName: 'Nefis Gemüse Kebap', locationHint: null },
			'Nefis Gemüse Kebap Kotti',
			VENUES,
		);
		expect(candidates[0].id).toBe('nefis');
		expect(candidates[0].score).toBeGreaterThan(candidates[0].raw);
	});

	it('leaves a weak match to the LLM', () => {
		const candidates = rankCandidates({ venueName: 'City Chicken', locationHint: 'Torstraße' }, null, VENUES);
		expect(candidates[0]?.id).toBe('nhas');
		expect(autoMatch(candidates)).toBeNull();
	});

	it('offers nothing for a name like no venue', () => {
		expect(rankCandidates({ venueName: 'Noma', locationHint: null }, null, VENUES)).toEqual([]);
	});
});
