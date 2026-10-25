import { describe, expect, it } from '@jest/globals';

import { parseAmount } from '../util/amounts.js';

/* The number a wait or price phrase states, read without an LLM: only what is written. */
describe('parseAmount', () => {
	const minutes = (detail: string) => parseAmount(detail, 'wait');
	const money = (detail: string) => parseAmount(detail, 'price');

	it('reads the minutes a wait states, a range at its upper end', () => {
		expect(minutes('waited 40 min')).toEqual({ amount: 40, unit: 'minutes' });
		expect(minutes('over an hour')).toEqual({ amount: 60, unit: 'minutes' });
		expect(minutes('30-40 minutes for the food')).toEqual({ amount: 40, unit: 'minutes' });
		expect(minutes('30 to 40 minutes')?.amount).toBe(40);
		expect(minutes('half an hour for a burger')?.amount).toBe(30);
		expect(minutes('1.5 hours wait')?.amount).toBe(90);
		expect(minutes('an hour and a half')?.amount).toBe(90);
		expect(minutes('waited 20 mins')?.amount).toBe(20);
	});

	it('reads a price in euro, either side of the number', () => {
		expect(money('€9.50')).toEqual({ amount: 9.5, unit: 'money' });
		expect(money('dürüm now 9,50 €')).toEqual({ amount: 9.5, unit: 'money' });
		expect(money('12 euros for a pizza')?.amount).toBe(12);
		expect(money('EUR 7')?.amount).toBe(7);
		expect(money('€8-10 a bowl')?.amount).toBe(10);
	});

	it('leaves a phrase that states no number empty', () => {
		expect(minutes('waited forever')).toBeUndefined();
		expect(minutes('too long')).toBeUndefined();
		expect(money('pricey')).toBeUndefined();
		expect(money('prices went up')).toBeUndefined();
	});

	it('reads only a wait or price topic, each its own unit', () => {
		expect(parseAmount('waited 40 min', 'service')).toBeUndefined();
		expect(parseAmount('€9.50 for a coffee', 'food')).toBeUndefined();
		// A wait point naming a price is no wait in minutes
		expect(minutes('€9.50 and a long wait')).toBeUndefined();
	});
});
