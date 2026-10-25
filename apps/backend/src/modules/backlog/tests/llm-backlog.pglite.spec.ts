import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { LLM_BACKLOG_SINGLETON_KEY } from '../constants/backlog.constant.js';
import { BacklogRun } from '../entities/backlog-run.entity.js';
import type { LlmBacklog } from '../interfaces/llm-backlog.interface.js';
import { LlmBacklogJob } from '../jobs/llm-backlog.job.js';
import { LlmBacklogService } from '../services/llm-backlog.service.js';
import { LlmBacklogRegistry } from '../services/llm-backlog-registry.service.js';

/** A backlog of `items` that settles `perBatch` a batch for `tokens` each; `fail(n)` decides batch n */
const fakeBacklog = (
	key: string,
	priority: number,
	opts: { items: number; perBatch: number; tokens?: number; fail?: (batch: number) => Error | undefined },
) => {
	const state = { left: opts.items, batches: 0, calls: [] as string[] };
	const backlog: LlmBacklog = {
		key,
		label: key,
		priority,
		remaining: async () => state.left,
		runBatch: async () => {
			state.batches++;
			state.calls.push(key);
			const error = opts.fail?.(state.batches);
			if (error) throw error;
			const done = Math.min(opts.perBatch, state.left);
			state.left -= done;
			return { done, tokens: opts.tokens };
		},
	};
	return { backlog, state };
};

const QUOTA = () =>
	new Error('No OpenAI account can serve openai/gpt-5.4-mini. #1 (…abcd): You exceeded your current quota');

const at = (iso: string) => () => new Date(iso);

/*
 * The daily LLM backlog run: backlogs by priority, the day's token budget over all of them, the
 * allowance stopping the day without failing the job, and a run row per backlog and day.
 */
describe('LLM backlog (pglite)', () => {
	let harness: PgliteTestingModule;
	let service: LlmBacklogService;
	let registry: LlmBacklogRegistry;
	const pgBoss = { sendJob: jest.fn(async (..._args: unknown[]) => undefined) };

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [LlmBacklogService, { provide: PgBossService, useValue: pgBoss }],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		service = harness.moduleRef.get(LlmBacklogService);
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(async () => {
		// A fresh registry per case, swapped into the service under test
		registry = new LlmBacklogRegistry();
		(service as unknown as { registry: LlmBacklogRegistry }).registry = registry;
		await harness.orm.em.nativeDelete(BacklogRun, {});
		harness.orm.em.clear();
	});

	const runs = async () => {
		harness.orm.em.clear();
		return harness.orm.em.find(BacklogRun, {}, { orderBy: { key: 'asc' } });
	};

	it('runs the higher priority first, stops at the budget and records a run per backlog', async () => {
		const calls: string[] = [];
		const a = fakeBacklog('a-first', 10, { items: 100, perBatch: 10, tokens: 1000 });
		const b = fakeBacklog('b-second', 20, { items: 50, perBatch: 10, tokens: 1000 });
		// Registered in the other order: priority decides
		registry.register(b.backlog);
		registry.register(a.backlog);
		const spy = (x: ReturnType<typeof fakeBacklog>) => {
			const run = x.backlog.runBatch;
			x.backlog.runBatch = async () => {
				calls.push(x.backlog.key);
				return run();
			};
		};
		spy(a);
		spy(b);

		await service.drain({ budget: 2500, now: at('2026-10-22T22:00:00Z') });

		// 1,000 + 1,000 + 1,000: the third batch starts under the budget, the fourth would not
		expect(calls).toEqual(['a-first', 'a-first', 'a-first']);
		const [ra, rb] = await runs();
		expect([ra.key, ra.day, ra.batches, ra.done, ra.tokens, ra.stopReason, ra.remaining]).toEqual([
			'a-first',
			'2026-10-22',
			3,
			30,
			3000,
			'budget',
			70,
		]);
		expect([rb.key, rb.batches, rb.done, rb.stopReason, rb.remaining]).toEqual(['b-second', 0, 0, 'budget', 50]);
	});

	it('moves on to the next backlog when one is empty', async () => {
		const a = fakeBacklog('a-first', 10, { items: 15, perBatch: 10, tokens: 100 });
		const b = fakeBacklog('b-second', 20, { items: 5, perBatch: 10, tokens: 100 });
		registry.register(a.backlog);
		registry.register(b.backlog);

		await service.drain({ budget: 1_000_000, now: at('2026-10-22T22:00:00Z') });

		expect((await runs()).map(r => [r.key, r.batches, r.done, r.tokens, r.stopReason, r.remaining])).toEqual([
			['a-first', 2, 15, 200, 'empty', 0],
			['b-second', 1, 5, 100, 'empty', 0],
		]);
	});

	it('stops the day on the allowance without failing, and the next run goes on', async () => {
		const a = fakeBacklog('a-first', 10, {
			items: 40,
			perBatch: 10,
			tokens: 500,
			fail: n => (n === 2 ? QUOTA() : undefined),
		});
		const b = fakeBacklog('b-second', 20, { items: 10, perBatch: 10, tokens: 500 });
		registry.register(a.backlog);
		registry.register(b.backlog);

		await expect(service.drain({ budget: 1_000_000, now: at('2026-10-22T22:00:00Z') })).resolves.toHaveLength(2);
		expect(b.state.batches).toBe(0);
		expect((await runs()).map(r => [r.key, r.batches, r.done, r.stopReason, r.remaining])).toEqual([
			['a-first', 1, 10, 'allowance', 30],
			['b-second', 0, 0, 'allowance', 10],
		]);

		// The next day: on where it stopped
		await service.drain({ budget: 1_000_000, now: at('2026-10-23T22:00:00Z') });
		expect(a.state.left).toBe(0);
		expect(b.state.left).toBe(0);
		const next = (await runs()).filter(r => r.day === '2026-10-23');
		expect(next.map(r => [r.key, r.done, r.stopReason, r.remaining])).toEqual([
			['a-first', 30, 'empty', 0],
			['b-second', 10, 'empty', 0],
		]);
	});

	it('stops only that backlog on another error, or on a batch that settles nothing', async () => {
		const a = fakeBacklog('a-broken', 10, {
			items: 10,
			perBatch: 10,
			fail: () => new Error('Bad schema'),
		});
		const b = fakeBacklog('b-stuck', 20, { items: 3, perBatch: 0 });
		const c = fakeBacklog('c-fine', 30, { items: 3, perBatch: 3 });
		registry.register(a.backlog);
		registry.register(b.backlog);
		registry.register(c.backlog);

		await service.drain({ budget: 1_000_000, now: at('2026-10-22T22:00:00Z') });

		const [ra, rb, rc] = await runs();
		expect([ra.stopReason, ra.error, ra.batches]).toEqual(['error', 'Bad schema', 0]);
		expect([rb.stopReason, rb.error, rb.batches]).toEqual(['error', 'A batch settled nothing with 3 left', 1]);
		expect([rc.stopReason, rc.done]).toEqual(['empty', 3]);
		// No tokens reported: the column stays empty, not zero
		expect(rc.tokens).toBeNull();
	});

	it('adds a second run the same day to the row, within what is left of the budget', async () => {
		const a = fakeBacklog('a-first', 10, { items: 100, perBatch: 10, tokens: 1000 });
		registry.register(a.backlog);

		await service.drain({ budget: 2000, now: at('2026-10-22T22:00:00Z') });
		// "Run now" later the same day: the budget is the day's, so nothing more runs
		await service.drain({ budget: 2000, now: at('2026-10-22T23:00:00Z') });
		const [run] = await runs();
		expect([run.batches, run.done, run.tokens, run.stopReason]).toEqual([2, 20, 2000, 'budget']);

		// After midnight UTC a new day and a new row
		await service.drain({ budget: 2000, now: at('2026-10-23T00:30:00Z') });
		expect((await runs()).map(r => [r.day, r.done])).toEqual([
			['2026-10-22', 20],
			['2026-10-23', 20],
		]);
	});

	it('stops starting batches at the time limit', async () => {
		let clock = new Date('2026-10-22T22:00:00Z').getTime();
		const a = fakeBacklog('a-slow', 10, { items: 100, perBatch: 10, tokens: 1 });
		const run = a.backlog.runBatch;
		// Each batch takes an hour
		a.backlog.runBatch = async () => {
			clock += 60 * 60_000;
			return run();
		};
		registry.register(a.backlog);

		await service.drain({ budget: 1_000_000, maxMinutes: 150, now: () => new Date(clock) });

		const [row] = await runs();
		expect([row.batches, row.stopReason]).toEqual([3, 'budget']);
	});

	it('lists each backlog with what is left, the last seven days and its newest run', async () => {
		const a = fakeBacklog('a-first', 10, { items: 30, perBatch: 10, tokens: 100 });
		registry.register(a.backlog);
		const em = harness.orm.em;
		// Eight days ago: outside the seven
		em.create(BacklogRun, { key: 'a-first', day: '2026-10-14', batches: 9, done: 900, tokens: 9 });
		em.create(BacklogRun, {
			key: 'a-first',
			day: '2026-10-20',
			batches: 1,
			done: 5,
			tokens: 50,
			stopReason: 'allowance',
			finishedAt: new Date('2026-10-20T22:10:00Z'),
		});
		await em.flush();
		await service.drain({ budget: 150, now: at('2026-10-22T22:00:00Z') });

		const status = await service.status(new Date('2026-10-22T23:00:00Z'));
		expect(status.spentToday).toBe(200);
		expect(status.backlogs).toHaveLength(1);
		const [s] = status.backlogs;
		expect([s.key, s.remaining, s.doneLast7Days, s.tokensLast7Days]).toEqual(['a-first', 10, 25, 250]);
		expect([s.lastRun?.day, s.lastRun?.stopReason]).toEqual(['2026-10-22', 'budget']);
		expect(s.lastMovedAt).toBeInstanceOf(Date);
	});

	it('queues the drain on one singleton key', async () => {
		await service.queue('admin');
		expect(pgBoss.sendJob).toHaveBeenCalledWith(
			LlmBacklogJob.jobName,
			new LlmBacklogJob({ trigger: 'admin' }),
			{ singletonKey: LLM_BACKLOG_SINGLETON_KEY },
		);
	});
});
