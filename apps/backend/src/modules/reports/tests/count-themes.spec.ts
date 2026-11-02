import { describe, expect, it } from '@jest/globals';

import type { StatementView } from 'src/modules/statements/util/statement-views.js';

import { countThemes } from '../util/summarize-report.js';

/* Aspect counts are sources, like root counts: a review raising an aspect twice counts once. */
describe('countThemes', () => {
	const complaint = (text: string, aspect?: string): StatementView => ({
		text,
		sentiment: 'negative',
		...(aspect && { aspect, root: 'price' }),
	});

	it('counts each source once per aspect, however many claims it split the aspect into', () => {
		expect(
			countThemes([
				[
					complaint('charged for water', 'extra_charges'),
					complaint('the sauce costs extra', 'extra_charges'),
					complaint('expensive', 'price_level'),
				],
				[complaint('a service fee on the bill', 'extra_charges')],
				[],
			]),
		).toEqual({ extra_charges: 2, price_level: 1 });
	});

	it('counts a claim about no aspect under none', () => {
		expect(
			countThemes([[complaint('charged for water', 'extra_charges')], [complaint('expensive')]]),
		).toEqual({ extra_charges: 1 });
		expect(countThemes([])).toEqual({});
	});
});
