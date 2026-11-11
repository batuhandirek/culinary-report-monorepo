import { describe, expect, it } from '@jest/globals';

import { venueAliases } from 'src/modules/venues/util/venue-names.js';

import { MentionMatchMethodEnum } from '../entities/mention.entity.js';
import {
	autoMatch,
	decideMatch,
	hintElsewhere,
	rankCandidates,
} from '../services/mention-matching.service.js';

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
		const candidates = rankCandidates(
			{ venueName: 'Hisar Fresh Food', locationHint: null },
			null,
			VENUES,
		);
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
		const candidates = rankCandidates(
			{ venueName: 'City Chicken', locationHint: 'Torstraße' },
			null,
			VENUES,
		);
		expect(candidates[0]?.id).toBe('nhas');
		expect(autoMatch(candidates)).toBeNull();
	});

	it('offers nothing for a name like no venue', () => {
		expect(rankCandidates({ venueName: 'Noma', locationHint: null }, null, VENUES)).toEqual([]);
	});

	it('leaves a sure name the hint places elsewhere to the LLM, and keeps it a candidate', async () => {
		const venues = [
			{ ...venue('velvet', 'Velvet', 'Neukölln'), street: 'Ganghoferstraße 1' },
			{ ...venue('other', 'Other place', 'Tempelhof-Schöneberg'), street: 'Goltzstraße 3' },
		];
		const mention = (locationHint: string) => ({
			venueName: 'Velvet',
			locationHint,
			city: 'Berlin',
			author: null,
			taggedLocation: null,
			said: [],
		});
		const asked: string[] = [];
		const ask = async (message: string) => {
			asked.push(message);
			return { venueId: null, branchId: null };
		};
		// Schöneberg: the exact name is still offered, but the LLM decides (here: none)
		expect(
			rankCandidates({ venueName: 'Velvet', locationHint: 'Schöneberg' }, null, venues)[0]
				?.id,
		).toBe('velvet');
		expect(
			await decideMatch(mention('Schöneberg'), venues, ['Berlin'], new Set(), ask),
		).toMatchObject({
			method: MentionMatchMethodEnum.NONE,
			brandId: null,
		});
		expect(asked).toHaveLength(1);
		// The right district, a place the venues don't know, or a hint calling itself a guess: accepted in code
		for (const hint of ['Neukölln', 'near the canal', 'Schöneberg (implied)'])
			expect(
				await decideMatch(mention(hint), venues, ['Berlin'], new Set(), ask),
			).toMatchObject({
				method: MentionMatchMethodEnum.EXACT,
				brandId: 'b-velvet',
			});
		expect(asked).toHaveLength(1);
		expect(hintElsewhere('Schöneberg', venues)('b-velvet')).toBe(true);
	});

	it('drops a sure chain when the LLM says none of its branches is where the post says', async () => {
		const chain = (id: string, district: string, street: string) => ({
			...venue(id, 'Goldies'),
			district,
			street,
			brandId: 'b-goldies',
			brandName: 'Goldies',
			branchCount: 2,
		});
		const venues = [
			chain('g1', 'Friedrichshain-Kreuzberg', 'Oranienstraße 6'),
			chain('g2', 'Neukölln', 'Weserstraße 1'),
		];
		const mention = {
			venueName: 'Goldies',
			locationHint: 'in the food hall of a department store',
			city: 'Berlin',
			author: null,
			taggedLocation: null,
			said: [],
		};
		const none = await decideMatch(mention, venues, ['Berlin'], new Set(), async () => ({
			venueId: null,
			branchId: null,
		}));
		expect(none).toMatchObject({
			method: MentionMatchMethodEnum.NONE,
			brandId: null,
			venueId: null,
		});
		const brand = await decideMatch(
			mention,
			venues,
			['Berlin'],
			new Set(),
			async (message: string) => ({
				venueId: (JSON.parse(message) as { candidates: { id: string }[] }).candidates[0].id,
				branchId: null,
			}),
		);
		expect(brand).toMatchObject({
			method: MentionMatchMethodEnum.EXACT,
			brandId: 'b-goldies',
			venueId: null,
		});
	});

	it("takes a branch's id for its chain, and asks nothing when the hint is only the city", async () => {
		const chain = (id: string, district: string, street: string) => ({
			...venue(id, 'Goldies'),
			district,
			street,
			brandId: 'b-goldies',
			brandName: 'Goldies',
			branchCount: 2,
		});
		const venues = [
			chain('g1', 'Friedrichshain-Kreuzberg', 'Oranienstraße 6'),
			chain('g2', 'Neukölln', 'Weserstraße 1'),
		];
		const mention = (locationHint: string) => ({
			venueName: 'Goldies',
			locationHint,
			city: 'Berlin',
			author: null,
			taggedLocation: null,
			said: [],
		});
		// The model answers with the other branch's id: still the chain, its branch unknown
		const byBranch = await decideMatch(
			mention('somewhere by the canal'),
			venues,
			['Berlin'],
			new Set(),
			async (m: string) => {
				const offered = (JSON.parse(m) as { candidates: { id: string }[] }).candidates[0]
					.id;
				return { venueId: offered === 'g1' ? 'g2' : 'g1', branchId: null };
			},
		);
		expect(byBranch).toMatchObject({ brandId: 'b-goldies', venueId: null });
		let asked = 0;
		await decideMatch(mention('Berlin'), venues, ['Berlin'], new Set(), async () => {
			asked++;
			return { venueId: null, branchId: null };
		});
		expect(asked).toBe(0);
	});
});
