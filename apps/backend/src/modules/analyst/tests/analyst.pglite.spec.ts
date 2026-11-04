import { EventEmitter2 } from '@nestjs/event-emitter';

import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { AnalystPartData } from 'sdk';

import { UserRoleEnum } from 'src/modules/auth/constants/user-role.enum.constant.js';
import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserService } from 'src/modules/auth/services/user.service.js';
import { userFactory } from 'src/modules/auth/tests/factories/user.factory.js';
import { cityFactory } from 'src/modules/cities/tests/factories/city.factory.js';
import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';
import { seedTopics } from 'src/modules/topics/tests/factories/topic.factory.js';
import { venueFactory } from 'src/modules/venues/tests/factories/venue.factory.js';
import { entityManagerManager } from 'src/shared/util/em.js';
import { createPgliteTestingModule, PgliteTestingModule } from 'src/tests/testing-module.js';

import { AnalystAgent } from '../agents/analyst.agent.js';
import { ANALYST_STORED_ROWS } from '../constants/analyst.constant.js';
import { AnalystMessageStatusEnum } from '../constants/analyst-message-status.enum.constant.js';
import { AnalystMessage } from '../entities/analyst-message.entity.js';
import { AnalystMessagePart } from '../entities/analyst-message-part.entity.js';
import { AnalystThread } from '../entities/analyst-thread.entity.js';
import { AnalystMessageCreatedEvent } from '../events/analyst-message-created.event.js';
import { AnalystPartChangedEvent } from '../events/analyst-part-changed.event.js';
import { AnalystPartDeltaEvent } from '../events/analyst-part-delta.event.js';
import { AnalystAnswerJob } from '../jobs/analyst-answer.job.js';
import { AnalystAnswerService } from '../services/analyst-answer.service.js';
import { AnalystReaderService } from '../services/analyst-reader.service.js';
import { AnalystSqlService } from '../services/analyst-sql.service.js';
import { AnalystThreadService } from '../services/analyst-thread.service.js';

import { roleReaderConnection } from './role-reader-connection.js';

type Tools = Record<string, { execute: (input: never, ctx?: never) => Promise<unknown> }>;
type Options = { onChunk: (chunk: unknown) => void; onStepFinish: () => Promise<void> };

/*
 * The analyst: its read-only window on the database, a question with its `@` mentions and its
 * queued answer, and an answer written part by part (the agent faked, calling the real tools).
 */
describe('The analyst (pglite)', () => {
	let harness: PgliteTestingModule;
	let sql: AnalystSqlService;
	let reader: AnalystReaderService;
	let threads: AnalystThreadService;
	let answers: AnalystAnswerService;
	let events: EventEmitter2;
	const pgBossService = { sendJobWithEm: jest.fn(async (..._args: unknown[]) => undefined) };
	const agent = {
		generate:
			jest.fn<(input: unknown, ctx: { tools: Tools }, opts: Options) => Promise<unknown>>(),
	};
	let admin: User;

	beforeAll(async () => {
		harness = await createPgliteTestingModule({
			providers: [
				AnalystReaderService,
				AnalystSqlService,
				AnalystThreadService,
				AnalystAnswerService,
				UserService,
				EventEmitter2,
				{ provide: PgBossService, useValue: pgBossService },
				{ provide: AnalystAgent, useValue: agent },
			],
		});
		entityManagerManager.setEntityManager(harness.orm.em);
		sql = harness.moduleRef.get(AnalystSqlService);
		reader = harness.moduleRef.get(AnalystReaderService);
		await reader.ensureRole(null);
		await reader.useConnection(roleReaderConnection(harness.orm.em));
		threads = harness.moduleRef.get(AnalystThreadService);
		answers = harness.moduleRef.get(AnalystAnswerService);
		events = harness.moduleRef.get(EventEmitter2);
		admin = await userFactory.create({ roles: [UserRoleEnum.ADMIN] });
	});

	afterAll(async () => {
		await harness.stop();
	});

	beforeEach(() => {
		pgBossService.sendJobWithEm.mockClear();
		agent.generate.mockReset();
		events.removeAllListeners();
		harness.orm.em.clear();
	});

	describe('the read-only window', () => {
		it('returns columns and rows, with jsonb’s ? operator left alone', async () => {
			const res = await sql.run(
				`select 1::int as one, 'a' as letter, '{"a":1}'::jsonb ? 'a' as has_a`,
			);
			expect(res).toMatchObject({
				ok: true,
				columns: ['one', 'letter', 'has_a'],
				rows: [[1, 'a', true]],
				truncated: false,
			});
		});

		it('keeps the first rows and says it cut', async () => {
			const res = await sql.run(
				'select g::int as n from generate_series(1, 700) g order by g',
			);
			expect(res).toMatchObject({ ok: true, rowCount: ANALYST_STORED_ROWS, truncated: true });
		});

		it('gives Postgres’s error as text', async () => {
			const res = await sql.run('select no_such_column from venues');
			expect(res).toMatchObject({
				ok: false,
				error: expect.stringContaining('no_such_column'),
			});
		});

		it('writes nothing, even through a function the guard can’t see into', async () => {
			await harness.orm.em.execute(
				`create or replace function analyst_test_write() returns int language sql as $$ insert into creators (name) values ('x') returning 1 $$`,
			);
			const res = await sql.run('select analyst_test_write() as n');
			expect(res).toMatchObject({
				ok: false,
				error: expect.stringMatching(/read-only|permission denied/),
			});
			expect(await sql.run('delete from venues')).toMatchObject({ ok: false });
			expect(await sql.run('select * from users')).toMatchObject({ ok: false });
		});

		it('runs as a role that may only read: the database refuses the rest, with no guard in front', async () => {
			const as = (query: string) => reader.read([], query);
			await expect(as('select count(*)::int as n from venues')).resolves.toMatchObject({
				rows: [[0]],
			});
			await expect(as('select email from users')).rejects.toThrow(/permission denied/);
			await expect(as("update venues set name = 'x'")).rejects.toThrow(
				/read-only|permission denied/,
			);
			await expect(as('create table analyst_test (id int)')).rejects.toThrow(
				/read-only|permission denied/,
			);
			// Switching role back (set_config('role', …)) is refused only to a session logged in as the
			// reader, as production's is; here the helper's session is PGlite's one superuser
			await expect(as("select pg_read_file('postmaster.pid')")).rejects.toThrow(
				/permission denied/,
			);
			await expect(as('select pg_terminate_backend(pg_backend_pid())')).rejects.toThrow(
				/permission denied|must be/,
			);
		});

		it('takes the grants back and gives them again at every boot', async () => {
			await harness.orm.em.execute('create table analyst_new_table (id int)');
			await reader.ensureRole(null);
			await expect(
				reader.read([], 'select count(*)::int as n from analyst_new_table'),
			).resolves.toMatchObject({ rows: [[0]] });
			await expect(reader.read([], 'select 1 from analyst_threads')).rejects.toThrow(
				/permission denied/,
			);
		});

		it('lists readable tables and describes one with its links', async () => {
			const list = await sql.schema();
			expect(list).toContain('venues');
			expect(list).not.toMatch(/^users /m);
			const venues = await sql.schema(['venues', 'users']);
			expect(venues).toMatch(/brand_id uuid → brands\.id/);
			expect(venues).not.toContain('users:');
		});
	});

	describe('a question', () => {
		it('starts a thread with its text and mentions, and queues the answer as the system account’s', async () => {
			const em = harness.orm.em;
			const city = await cityFactory.create({ name: 'Berlin' });
			const venue = await venueFactory.create(
				{ name: 'Burgermeister' },
				{ associations: { city } },
			);
			seedTopics(em, ['wait']);
			await em.flush();
			const created: AnalystMessageCreatedEvent[] = [];
			events.on(AnalystMessageCreatedEvent.type, (e: AnalystMessageCreatedEvent) =>
				created.push(e),
			);

			const out = await threads.ask(
				admin.id,
				`Why do people complain about @Aspect:wait at @Venue:${venue.id}?`,
			);

			expect(out.thread.title).toBe('Why do people complain about Waiting at Burgermeister?');
			expect(out.question.parts.map(p => p.data.type)).toEqual(['text', 'mentions']);
			const mentions = (
				out.question.parts[1].data as Extract<AnalystPartData, { type: 'mentions' }>
			).mentions;
			expect(mentions).toMatchObject([
				{ type: 'aspect', ref: 'wait', found: true },
				{ type: 'venue', ref: venue.id, label: 'Burgermeister', found: true },
			]);
			expect(mentions[1].facts).toContain(`venues.id = '${venue.id}'`);
			expect(out.answer).toMatchObject({
				status: 'queued',
				author: { roles: [UserRoleEnum.SYSTEM] },
			});
			expect(pgBossService.sendJobWithEm).toHaveBeenCalledWith(
				expect.anything(),
				AnalystAnswerJob.jobName,
				{
					payload: { messageId: out.answer.id },
				},
			);
			expect(created.map(e => e.payload.message.id)).toEqual([
				out.question.id,
				out.answer.id,
			]);

			// One system account, however many answers
			await threads.ask(admin.id, 'Another one');
			expect(
				await em.fork().count(User, { roles: { $contains: [UserRoleEnum.SYSTEM] } }),
			).toBe(1);
		});

		it('refuses a follow-up while the answer is being written, and takes it once done', async () => {
			const first = await threads.ask(admin.id, 'How many venues?');
			await expect(
				threads.ask(admin.id, 'And brands?', first.thread.id),
			).rejects.toMatchObject({ status: 409 });

			await harness.orm.em.nativeUpdate(
				AnalystMessage,
				{ id: first.answer.id },
				{ status: AnalystMessageStatusEnum.DONE },
			);
			const second = await threads.ask(admin.id, 'And brands?', first.thread.id);
			const detail = await threads.get(first.thread.id);
			expect(detail.messages.map(m => m.id)).toEqual([
				first.question.id,
				first.answer.id,
				second.question.id,
				second.answer.id,
			]);
		});

		it('says a mention names nothing', async () => {
			const out = await threads.ask(
				admin.id,
				'What about @Brand:00000000-0000-4000-8000-000000000000?',
			);
			expect(
				(out.question.parts[1].data as Extract<AnalystPartData, { type: 'mentions' }>)
					.mentions,
			).toEqual([
				{ type: 'brand', ref: '00000000-0000-4000-8000-000000000000', found: false },
			]);
		});
	});

	describe('an answer', () => {
		it('keeps the text, the plan and each query as parts in the order they came, and the cost', async () => {
			const asked = await threads.ask(admin.id, 'How many cities are there?');
			const deltas: string[] = [];
			const changes: AnalystPartChangedEvent[] = [];
			events.on(AnalystPartDeltaEvent.type, (e: AnalystPartDeltaEvent) =>
				deltas.push(e.payload.delta),
			);
			events.on(AnalystPartChangedEvent.type, (e: AnalystPartChangedEvent) =>
				changes.push(e),
			);

			agent.generate.mockImplementation(async (input, { tools }, opts) => {
				expect(JSON.stringify(input)).toContain('How many cities are there?');
				opts.onChunk({ type: 'text-delta', payload: { text: 'Let me ' } });
				opts.onChunk({ type: 'text-delta', payload: { text: 'count.' } });
				opts.onChunk({ type: 'tool-call', payload: {} });
				await tools.plan.execute({
					steps: [{ title: 'Count cities', status: 'doing' }],
				} as never);
				const result = (await tools.run_sql.execute({
					purpose: 'count cities',
					sql: 'select count(*)::int as cities from cities',
					show: true,
					title: 'Cities',
					chart: { kind: 'bar', x: 'nope', y: ['cities'] },
				} as never)) as { rows: string; chartNote?: string };
				expect(result.rows.split('\n')[0]).toBe('cities');
				expect(result.chartNote).toContain('nope');
				await opts.onStepFinish();
				opts.onChunk({
					type: 'text-delta',
					payload: { text: 'There are **some** cities.' },
				});
				await opts.onStepFinish();
				return {
					text: 'There are **some** cities.',
					model: 'anthropic/claude-sonnet-5-5',
					totalUsage: {
						inputTokens: 10_000,
						outputTokens: 1_000,
						cachedInputTokens: 0,
						cacheCreationInputTokens: 0,
					},
					steps: [{}, {}],
				};
			});

			await answers.answer(asked.answer.id);

			const detail = await threads.get(asked.thread.id);
			const answer = detail.messages[1];
			expect(answer).toMatchObject({
				status: 'done',
				model: 'anthropic/claude-sonnet-5-5',
				usage: { steps: 2, queries: 1 },
			});
			expect(answer.usd).toBeCloseTo(0.03);
			expect(detail.thread.usd).toBeCloseTo(0.03);
			expect(answer.parts.map(p => p.data.type)).toEqual(['text', 'plan', 'query', 'text']);
			expect(answer.parts.every(p => !p.streaming)).toBe(true);
			expect(answer.parts[0].data).toEqual({ type: 'text', text: 'Let me count.' });
			expect(answer.parts[2].data).toMatchObject({
				type: 'query',
				show: true,
				title: 'Cities',
				columns: ['cities'],
				rowCount: 1,
			});
			expect((answer.parts[2].data as { chart?: unknown }).chart).toBeUndefined();
			expect(deltas.join('')).toContain('count.');
			expect(
				changes.some(
					c => c.payload.change === 'created' && c.payload.part.data.type === 'query',
				),
			).toBe(true);
		});

		it('ends failed with the error as its last part, and is never answered twice', async () => {
			const asked = await threads.ask(admin.id, 'Break');
			agent.generate.mockRejectedValue(new Error('No model can serve analyst'));

			await answers.answer(asked.answer.id);
			await answers.answer(asked.answer.id);

			expect(agent.generate).toHaveBeenCalledTimes(1);
			const answer = (await threads.get(asked.thread.id)).messages[1];
			expect(answer.status).toBe('failed');
			expect(answer.parts.at(-1)?.data).toMatchObject({
				type: 'error',
				message: expect.stringContaining('No model'),
			});
		});

		it('fails, at boot, an answer a restart cut off', async () => {
			const asked = await threads.ask(admin.id, 'Cut off');
			await harness.orm.em.nativeUpdate(
				AnalystMessage,
				{ id: asked.answer.id },
				{ status: AnalystMessageStatusEnum.RUNNING },
			);

			await answers.onApplicationBootstrap();

			const em = harness.orm.em.fork();
			expect((await em.findOneOrFail(AnalystMessage, asked.answer.id)).status).toBe('failed');
			expect(await em.count(AnalystMessagePart, { message: asked.answer.id })).toBe(1);
		});

		it('goes with its thread', async () => {
			const asked = await threads.ask(admin.id, 'Delete me');
			await threads.remove(asked.thread.id);
			const em = harness.orm.em.fork();
			expect(await em.count(AnalystThread, { id: asked.thread.id })).toBe(0);
			expect(await em.count(AnalystMessage, { thread: asked.thread.id })).toBe(0);
		});
	});
});
