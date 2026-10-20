import { describe, expect, it } from '@jest/globals';

import { replyCandidates } from '../util/reply-drafts.js';

describe('replyCandidates', () => {
	it('takes unanswered written reviews, lowest stars first, then newest, ten at most', () => {
		const at = (day: number) => new Date(Date.UTC(2026, 8, day));
		const reviews = [
			{ reviewId: 'answered', publishedAt: at(1), stars: 1, text: 'x', ownerResponse: 'ok' },
			{ reviewId: 'stars-only', publishedAt: at(1), stars: 1 },
			{ reviewId: 'five-old', publishedAt: at(2), stars: 5, text: 'great' },
			{ reviewId: 'five-new', publishedAt: at(20), stars: 5, textTranslated: 'great' },
			{ reviewId: 'two', publishedAt: at(3), stars: 2, text: 'bad' },
			...Array.from({ length: 12 }, (_, i) => ({
				reviewId: `four-${i}`,
				publishedAt: at(4 + i),
				stars: 4,
				text: 'fine',
			})),
		];
		const picked = replyCandidates(reviews).map(r => r.reviewId);
		expect(picked).toHaveLength(10);
		expect(picked[0]).toBe('two');
		expect(picked[1]).toBe('four-11');
		expect(picked).not.toContain('answered');
		expect(picked).not.toContain('stars-only');
		expect(picked).not.toContain('five-new');
	});
});
