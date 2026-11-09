import { describe, expect, it } from '@jest/globals';

import { placeIdsOf, reviewsInput } from '../util/reviews-input.js';

/** The actor's input per mode: the shared flags written once, each place once */
describe('reviewsInput', () => {
	it('a fetch from a day: every review since, newest first, in English, without the reviewer', () => {
		expect(
			reviewsInput({ mode: 'since', placeIds: ['a', 'b', 'a'], since: '2026-09-01' }),
		).toEqual({
			placeIds: ['a', 'b'],
			reviewsStartDate: '2026-09-01',
			reviewsSort: 'newest',
			language: 'en',
			personalData: false,
		});
	});

	it("each place's newest review: one a place, no start date", () => {
		expect(
			reviewsInput({
				mode: 'newest',
				places: [
					{ placeId: 'a', since: '2026-10-18' },
					{ placeId: 'b', since: '2026-10-20' },
				],
			}),
		).toEqual({
			placeIds: ['a', 'b'],
			maxReviews: 1,
			reviewsSort: 'newest',
			language: 'en',
			personalData: false,
		});
	});

	it('the places of a fetch, in the order given, each once', () => {
		expect(
			placeIdsOf({
				mode: 'newest',
				places: [
					{ placeId: 'b', since: 'd' },
					{ placeId: 'a', since: 'd' },
					{ placeId: 'b', since: 'd' },
				],
			}),
		).toEqual(['b', 'a']);
	});
});
