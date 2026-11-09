import { describe, expect, it } from '@jest/globals';

import { CREATOR_WATCH_DAY } from '../../creator-watch/constants/creator-watch.constant.js';
import {
	SCRAPE_INSTAGRAM_DAY,
	SCRAPE_INSTAGRAM_MONTH,
	SCRAPE_INSTAGRAM_WEEK,
} from '../../scrape-instagram/constants/scrape-instagram.constant.js';
import { SCRAPE_TIKTOK_WEEK } from '../../scrape-tiktok/constants/scrape-tiktok.constant.js';
import { SCRAPE_VENUE_SOCIAL_WEEK } from '../../scrape-venue-social/constants/scrape-venue-social.constant.js';
import {
	runOperation,
	startForCronCities,
	type OperationRun,
} from '../util/operations.js';

type Started = { args: unknown[]; options: Record<string, unknown> };

/** The facade's `step` and `start` as the helpers use them, every start recorded */
const fakeDurable = () => {
	const started: Started[] = [];
	return {
		started,
		step: <T>(_name: string, fn: () => Promise<T>) => fn(),
		start: (_fn: unknown, args: unknown[], options: Record<string, unknown>) => {
			started.push({ args, options });
			return Promise.resolve({ getResult: () => Promise.resolve('done') });
		},
	};
};

const cityService = {
	forMonthlyCron: () =>
		Promise.resolve([
			{ id: 'berlin', slug: 'berlin' },
			{ id: 'hamburg', slug: 'hamburg' },
		]),
};

const workflow = (_cityId: string, _period: string) => Promise.resolve('done');
const queue = { name: 'test-queue' } as unknown as OperationRun['queue'];

/** An operation's run carries its own level to every start, whoever starts it */
describe('operation runs', () => {
	const high: OperationRun = { operation: 'posts', cadence: 'day', queue, priority: 'high' };
	const plain: OperationRun = { operation: 'reviews', cadence: 'day', queue };

	it("a schedule starts each city's run at the operation's level", async () => {
		const durable = fakeDurable();
		await startForCronCities(durable as never, cityService as never, workflow, high, '2026-11-09');
		expect(durable.started.map(s => [s.options.workflowId, s.options.priority])).toEqual([
			['posts.day-berlin-2026-11-09', 'high'],
			['posts.day-hamburg-2026-11-09', 'high'],
		]);
	});

	it('a dependent operation starts the run at its level too', async () => {
		const durable = fakeDurable();
		await runOperation(durable as never, workflow, high, 'berlin', '2026-11-09');
		expect(durable.started[0].options.priority).toBe('high');
	});

	it("a run without a level names none, so it takes its starter's", async () => {
		const durable = fakeDurable();
		await startForCronCities(durable as never, cityService as never, workflow, plain, '2026-11-09');
		await runOperation(durable as never, workflow, plain, 'berlin', '2026-11-09');
		for (const { options } of durable.started) expect('priority' in options).toBe(false);
	});

	it('the post streams are high: a late run misses posts their sources no longer show', () => {
		for (const run of [
			SCRAPE_INSTAGRAM_DAY,
			SCRAPE_INSTAGRAM_WEEK,
			SCRAPE_TIKTOK_WEEK,
			SCRAPE_VENUE_SOCIAL_WEEK,
			CREATOR_WATCH_DAY,
		])
			expect(run.priority).toBe('high');
		// The month's catch-up search is not a stream
		expect(SCRAPE_INSTAGRAM_MONTH.priority).toBeUndefined();
	});
});
