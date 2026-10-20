import { describe, expect, it } from '@jest/globals';

import { isFatalProviderError, runPool } from './pool.js';

describe('runPool', () => {
	it('reports a failing item and goes on with the others', async () => {
		const done: number[] = [];
		const failed: number[] = [];
		await runPool(
			[1, 2, 3, 4],
			2,
			async n => {
				if (n === 2) throw new Error('bad item');
				done.push(n);
			},
			n => failed.push(n),
		);
		expect(done.sort()).toEqual([1, 3, 4]);
		expect(failed).toEqual([2]);
	});

	it('stops and rethrows when the provider has no credits left', async () => {
		const started: number[] = [];
		const noCredits = Object.assign(
			new Error('You have no credits remaining. Add credits to continue using the API'),
			{ statusCode: 429 },
		);
		await expect(
			runPool(
				Array.from({ length: 20 }, (_, i) => i),
				2,
				async n => {
					started.push(n);
					throw noCredits;
				},
			),
		).rejects.toBe(noCredits);
		// The two in flight, nothing after
		expect(started.length).toBeLessThanOrEqual(2);
	});

	it('knows the account-level errors from the item-level ones', () => {
		expect(isFatalProviderError(new Error('invalid x-api-key'))).toBe(true);
		expect(isFatalProviderError({ message: 'Unauthorized', statusCode: 401 })).toBe(true);
		expect(isFatalProviderError(new Error('You exceeded your current quota'))).toBe(true);
		expect(isFatalProviderError(new Error('Response did not match the schema'))).toBe(false);
		expect(isFatalProviderError({ message: 'Rate limit reached', statusCode: 429 })).toBe(false);
		// Apify's memory refusal is a wait, not a dead account
		expect(
			isFatalProviderError({
				message: 'By launching this job you will exceed the memory limit of 16384MB for all your Actor runs',
				statusCode: 402,
			}),
		).toBe(false);
	});
});
