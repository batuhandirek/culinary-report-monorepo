import { Entity, Property } from '@mikro-orm/decorators/legacy';

import { jest } from '@jest/globals';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { createPgliteOrm, PgliteOrm } from '../../../tests/pglite-orm.js';
import { StateMachineEntityAbstractClass } from '../abstractions/fsm-entity.abstract-class.js';
import { FsmStateChange } from '../entities/fsm-state-change.entity.js';
import { FiniteStateMachine } from '../fsm.js';
import { FsmStateChangeSink } from '../services/fsm-state-change.sink.js';
import {
	defineAction,
	FsmEffectSink,
	FsmEventSink,
	RecordedTransition,
	StateMachineConfig,
	StateNode,
} from '../types/fsm.types.js';

/* End-to-end coverage of the interpreter against a real (in-process) Postgres: the audit
 * trail, and — crucially — the boundary-commit atomicity guarantee (a hook error or a
 * commit-time failure must leave the database completely untouched). */

@Entity({ tableName: 'test_widgets' })
class TestWidget extends StateMachineEntityAbstractClass {
	@Property({ type: 'text', nullable: true })
	state?: string;

	@Property({ type: 'boolean', default: false })
	ready!: boolean;
}

/** A side entity a hook creates via ctx.persist — used to prove extra entities roll back too. */
@Entity({ tableName: 'test_notes' })
class TestNote extends MikroOrmEntityAbstractClass {
	@Property({ type: 'text' })
	text!: string;
}

const Begin = defineAction()('Begin');
const Wait = defineAction()('Wait');
const Finish = defineAction<{ note: string }>()('Finish');
const Resume = defineAction()('Resume');
const Loop = defineAction()('Loop');

type WidgetStates = Record<string, StateNode<TestWidget, 'state'>>;

const buildFsm = (
	states: WidgetStates,
	opts: Partial<StateMachineConfig<TestWidget, 'state'>> = {},
): FiniteStateMachine<TestWidget, 'state'> =>
	new FiniteStateMachine<TestWidget, 'state'>({
		fsmName: 'test-widget',
		fsmVersion: 1,
		ownerType: 'TestWidget',
		states,
		initial: 'PENDING',
		stateField: 'state',
		changeSink: new FsmStateChangeSink(),
		...opts,
	});

describe('FiniteStateMachine (pglite)', () => {
	let harness: PgliteOrm;

	beforeAll(async () => {
		harness = await createPgliteOrm([TestWidget, TestNote, FsmStateChange]);
	});

	afterAll(async () => {
		await harness.stop();
	});

	afterEach(async () => {
		// Isolate rows between tests.
		const em = harness.orm.em.fork();
		await em.nativeDelete(FsmStateChange, {});
		await em.nativeDelete(TestNote, {});
		await em.nativeDelete(TestWidget, {});
	});

	const seedWidget = async (state: string): Promise<string> => {
		const em = harness.orm.em.fork();
		const widget = em.create(TestWidget, { state, ready: false });
		await em.flush();
		return widget.id;
	};

	const rowsFor = (ownerId: string) =>
		harness.orm.em.fork().find(FsmStateChange, { ownerId }, { orderBy: { createdAt: 'asc' } });

	// ────────────────────────────────────────────────────────── happy path
	describe('driving a turn', () => {
		const machine = (): WidgetStates => ({
			PENDING: {
				name: 'PENDING',
				transitions: { Begin: 'RUNNING' },
				afterTransitionIn: c => c.dispatch(Begin),
			},
			RUNNING: {
				name: 'RUNNING',
				transitions: { Wait: 'AWAITING' },
				afterTransitionIn: c => c.dispatch(Wait),
			},
			AWAITING: {
				name: 'AWAITING',
				durable: true,
				transitions: { Resume: 'DONE' },
				onResume: c => (c.entity.ready ? c.dispatch(Resume) : c.park()),
			},
			DONE: { name: 'DONE', terminal: true, transitions: {} },
		});

		it('steps through transient states and parks at the durable one', async () => {
			const fsm = buildFsm(machine());
			const em = harness.orm.em.fork();
			const widget = em.create(TestWidget, { ready: false });
			await em.flush();

			const result = await fsm.run(widget, em);

			expect(result.status).toBe('parked');
			expect(result.state).toBe('AWAITING');
			expect(widget.state).toBe('AWAITING');
			expect(widget.fsmVersion).toBe(1);

			const rows = await rowsFor(widget.id);
			expect(rows.map(r => `${r.fromState}->${r.toState}:${r.kind}`)).toEqual([
				'PENDING->RUNNING:transient',
				'RUNNING->AWAITING:durable',
			]);
		});

		it('resumes from the persisted durable state and completes once ready', async () => {
			const fsm = buildFsm(machine());
			const id = await seedWidget('AWAITING');
			const em = harness.orm.em.fork();
			const widget = await em.findOneOrFail(TestWidget, { id });
			widget.ready = true;
			await em.flush();

			const result = await fsm.run(widget, em);

			expect(result.status).toBe('completed');
			expect(result.state).toBe('DONE');
			const reloaded = await harness.orm.em.fork().findOneOrFail(TestWidget, { id });
			expect(reloaded.state).toBe('DONE');

			const rows = await rowsFor(id);
			expect(rows.map(r => `${r.fromState}->${r.toState}`)).toEqual(['AWAITING->DONE']);
		});

		it('stamps every audit row with the turn/machine/owner metadata', async () => {
			const fsm = buildFsm({
				PENDING: {
					name: 'PENDING',
					transitions: { Begin: 'RUNNING' },
					afterTransitionIn: c => c.dispatch(Begin),
				},
				RUNNING: {
					name: 'RUNNING',
					transitions: { Finish: 'DONE' },
					afterTransitionIn: c => c.dispatch(Finish, { note: 'hi' }),
				},
				DONE: { name: 'DONE', terminal: true, transitions: {} },
			});
			const em = harness.orm.em.fork();
			const widget = em.create(TestWidget, { ready: false });
			await em.flush();

			const result = await fsm.run(widget, em);
			const rows = await rowsFor(widget.id);

			expect(rows).toHaveLength(2);
			for (const row of rows) {
				expect(row.fsmName).toBe('test-widget');
				expect(row.fsmVersion).toBe(1);
				expect(row.ownerType).toBe('TestWidget');
				expect(row.ownerId).toBe(widget.id);
				expect(row.turnId).toBe(result.turnId);
			}
			// The whole turn shares one turnId.
			expect(new Set(rows.map(r => r.turnId)).size).toBe(1);
			// Payload handed to dispatch is captured on the edge.
			const finishRow = rows.find(r => r.action === 'Finish');
			expect(finishRow?.params).toEqual({ note: 'hi' });
			expect(rows.find(r => r.action === 'Begin')?.params ?? null).toBeNull();

			// The fsmTransitions formula: lazy (absent unless populated), and ordered by
			// turn + step when it is.
			const bare = await harness.orm.em.fork().findOneOrFail(TestWidget, { id: widget.id });
			expect(bare.fsmTransitions).toBeUndefined();

			const populated = await harness.orm.em
				.fork()
				.findOneOrFail(TestWidget, { id: widget.id }, { populate: ['fsmTransitions'] });
			expect(
				populated.fsmTransitions?.map(t => `${t.fromState}->${t.toState}@${t.turnStep}`),
			).toEqual(['PENDING->RUNNING@0', 'RUNNING->DONE@1']);
			expect(populated.fsmTransitions?.[0].turnId).toBe(result.turnId);
		});
	});

	// ─────────────────────────────────────────────────── reading the audit trail
	it('exposes the running turn’s edges via includePending, never via the default read', async () => {
		let pendingSeen: RecordedTransition | undefined;
		let committedSeenDuringTurn: RecordedTransition[] | undefined;
		const fsm = buildFsm({
			PENDING: {
				name: 'PENDING',
				transitions: { Begin: 'RUNNING' },
				afterTransitionIn: c => c.dispatch(Begin),
			},
			RUNNING: {
				name: 'RUNNING',
				transitions: { Finish: 'DONE' },
				afterTransitionIn: c => c.dispatch(Finish, { note: 'staged-in-turn' }),
			},
			DONE: {
				name: 'DONE',
				terminal: true,
				transitions: {},
				afterTransitionIn: async c => {
					// A LATER state reading a payload dispatched earlier in the SAME turn.
					pendingSeen = await c.latestTransition({
						action: 'Finish',
						includePending: true,
					});
					committedSeenDuringTurn = await c.findTransitions({ action: 'Finish' });
				},
			},
		});
		const em = harness.orm.em.fork();
		const widget = em.create(TestWidget, { ready: false });
		await em.flush();

		const result = await fsm.run(widget, em);

		// Inside the turn, the pending read saw the just-dispatched edge + payload…
		expect(pendingSeen?.pending).toBe(true);
		expect(pendingSeen?.params).toEqual({ note: 'staged-in-turn' });
		expect(pendingSeen?.turnId).toBe(result.turnId);
		// …while the committed-only read correctly saw nothing mid-turn.
		expect(committedSeenDuringTurn).toHaveLength(0);
	});

	// ────────────────────────────────────────────────────────── atomicity
	describe('atomicity', () => {
		it('a hook that throws aborts the turn — nothing is written', async () => {
			const fsm = buildFsm({
				PENDING: {
					name: 'PENDING',
					transitions: { Begin: 'RUNNING' },
					afterTransitionIn: c => c.dispatch(Begin),
				},
				RUNNING: {
					name: 'RUNNING',
					transitions: {},
					afterTransitionIn: c => {
						c.persist(c.em.create(TestNote, { text: 'orphan' }));
						throw new Error('boom in RUNNING');
					},
				},
			});
			const id = await seedWidget('PENDING');
			const em = harness.orm.em.fork();
			const widget = await em.findOneOrFail(TestWidget, { id });

			await expect(fsm.run(widget, em)).rejects.toThrow('boom in RUNNING');

			// State pointer never advanced, no audit rows, the ctx.persist'd note never landed.
			const reloaded = await harness.orm.em.fork().findOneOrFail(TestWidget, { id });
			expect(reloaded.state).toBe('PENDING');
			expect(await rowsFor(id)).toHaveLength(0);
			expect(await harness.orm.em.fork().count(TestNote, {})).toBe(0);
		});

		it('a failure during the boundary commit rolls the whole turn back', async () => {
			// Effects flush INSIDE the commit transaction (after the pointer + audit rows are
			// written), so a throwing effect sink forces a rollback of writes already issued.
			const effectSink = {
				publish: jest.fn().mockRejectedValue(new Error('sink exploded') as never),
				sendJob: jest.fn(),
			} as FsmEffectSink;
			const eventSink: FsmEventSink = { emit: jest.fn() };

			const fsm = buildFsm(
				{
					PENDING: {
						name: 'PENDING',
						transitions: { Begin: 'RUNNING' },
						afterTransitionIn: c => c.dispatch(Begin),
					},
					RUNNING: {
						name: 'RUNNING',
						transitions: { Finish: 'DONE' },
						afterTransitionIn: c => {
							c.persist(c.em.create(TestNote, { text: 'note' }));
							c.publish('widget.done', { payload: {} });
							c.emit('widget.done', {});
							return c.dispatch(Finish, { note: 'x' });
						},
					},
					DONE: { name: 'DONE', terminal: true, transitions: {} },
				},
				{ effectSink, eventSink },
			);
			const id = await seedWidget('PENDING');
			const em = harness.orm.em.fork();
			const widget = await em.findOneOrFail(TestWidget, { id });

			await expect(fsm.run(widget, em)).rejects.toThrow('sink exploded');

			// Everything the turn would have written is gone; the in-memory event never fired.
			const reloaded = await harness.orm.em.fork().findOneOrFail(TestWidget, { id });
			expect(reloaded.state).toBe('PENDING');
			expect(await rowsFor(id)).toHaveLength(0);
			expect(await harness.orm.em.fork().count(TestNote, {})).toBe(0);
			expect(effectSink.publish).toHaveBeenCalledTimes(1);
			expect(eventSink.emit).not.toHaveBeenCalled();
		});

		it('a transient cycle trips the maxSteps guard without writing', async () => {
			const fsm = buildFsm(
				{
					PENDING: {
						name: 'PENDING',
						transitions: { Begin: 'A' },
						afterTransitionIn: c => c.dispatch(Begin),
					},
					A: {
						name: 'A',
						transitions: { Loop: 'B' },
						afterTransitionIn: c => c.dispatch(Loop),
					},
					B: {
						name: 'B',
						transitions: { Loop: 'A' },
						afterTransitionIn: c => c.dispatch(Loop),
					},
				},
				{ maxSteps: 10 },
			);
			const id = await seedWidget('PENDING');
			const em = harness.orm.em.fork();
			const widget = await em.findOneOrFail(TestWidget, { id });

			await expect(fsm.run(widget, em)).rejects.toThrow(/maxSteps/);
			expect(await rowsFor(id)).toHaveLength(0);
		});
	});

	// ──────────────────────────────────────────────────── effects & events
	it('sends effects and fires events only after the commit succeeds', async () => {
		const effectSink = {
			publish: jest.fn(),
			sendJob: jest.fn(),
		} as FsmEffectSink;
		const eventSink: FsmEventSink = { emit: jest.fn() };

		const fsm = buildFsm(
			{
				PENDING: {
					name: 'PENDING',
					transitions: { Begin: 'RUNNING' },
					afterTransitionIn: c => c.dispatch(Begin),
				},
				RUNNING: {
					name: 'RUNNING',
					transitions: { Finish: 'DONE' },
					afterTransitionIn: c => {
						c.persist(c.em.create(TestNote, { text: 'note' }));
						c.publish('widget.done', { payload: { ok: true } });
						c.emit('widget.done', { ok: true });
						return c.dispatch(Finish, { note: 'x' });
					},
				},
				DONE: { name: 'DONE', terminal: true, transitions: {} },
			},
			{ effectSink, eventSink },
		);
		const em = harness.orm.em.fork();
		const widget = em.create(TestWidget, { ready: false });
		await em.flush();

		const result = await fsm.run(widget, em);

		expect(result.status).toBe('completed');
		expect(result.effects).toHaveLength(1);
		expect(result.emits).toHaveLength(1);
		expect(effectSink.publish).toHaveBeenCalledWith(expect.anything(), 'widget.done', {
			payload: { ok: true },
		});
		expect(eventSink.emit).toHaveBeenCalledWith('widget.done', { ok: true });

		const reloaded = await harness.orm.em.fork().findOneOrFail(TestWidget, { id: widget.id });
		expect(reloaded.state).toBe('DONE');
		expect(await harness.orm.em.fork().count(TestNote, {})).toBe(1);
		expect(await rowsFor(widget.id)).toHaveLength(2);
	});
});
