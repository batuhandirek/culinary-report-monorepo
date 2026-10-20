import { EntityManager } from '@mikro-orm/core';

import { Logger } from '@nestjs/common';

import { randomUUID } from 'node:crypto';

import { StateMachineEntityAbstractClass } from './abstractions/fsm-entity.abstract-class.js';
import {
	AnyState,
	FsmChangeMeta,
	FsmChangeSink,
	FsmEffect,
	FsmEffectSink,
	FsmEmit,
	FsmEventSink,
	FsmLogger,
	FsmTransitionQuery,
	FsmTurnHandle,
	RecordedTransition,
	RunResult,
	StateMachineConfig,
	StepOutcome,
	TransitionContext,
	TransitionRecord,
	Transitions,
} from './types/fsm.types.js';
import { FsmTurnConflictError, FsmTurnInProgressError } from './fsm-errors.js';
import { FsmTracer } from './fsm-tracing.js';

/* ════════════════════════════════════════════════════════════════════════════
 * FINITE STATE MACHINE — reusable core (interpreter)
 *
 * Public types & action tokens live in `state-machine.types.ts`; a runnable
 * sample machine (and its tests) lives in `tests/`.
 *
 *  • Data-dependent transitions: a state's entry hook RUNS the work (agent call,
 *    payment capture, …) and then *chooses* which of its allowed actions to fire.
 *    The transition table is an honest allow-list of edges, not a control-flow
 *    promise. `ctx.dispatch` only accepts actions declared in *this* state's
 *    `transitions`, with that action's payload type.
 *
 *  • Durable vs. transient states:
 *      - transient  → the interpreter keeps stepping in-memory this turn.
 *      - durable    → we persist the state pointer and STOP (park), awaiting an
 *                     external signal. A crash mid-turn rolls back and resumes at
 *                     the last durable resting point, re-running idempotently.
 *
 *  • Two entry hooks, distinguished by HOW the interpreter arrives:
 *      - afterTransitionIn → the loop transitioned INTO this state this turn.
 *      - onResume          → the interpreter BOOTED at this (persisted, durable)
 *                            state because a job fired.
 *    A durable wait state with no `afterTransitionIn` parks on entry for free —
 *    the emission that precedes the wait lives in the *previous* running state.
 *    Booting at a TERMINAL state is a no-op: terminal entry work runs when the
 *    machine transitions in, never again on a later (stray) wake-up.
 *
 *  • Side effects are DEFERRED. Hooks never touch pg-boss or flush; they enqueue
 *    (`ctx.publish` / `ctx.sendJob`) and mutate the in-memory entity graph. The
 *    interpreter runs every hook OUTSIDE any transaction (so a multi-second agent
 *    call never holds a DB tx open), then commits the whole turn in ONE short
 *    `em.transactional` at the resting boundary: state pointer + FsmStateChange
 *    rows + queued pg-boss events, atomically. Effects therefore exist only once
 *    the durable pointer advances — which is what makes resume idempotent.
 *
 *  • Nesting: a hook can drive a child machine with `childFsm.runNested(entity,
 *    ctx)`. The child steps exactly like a root run but does NOT commit — its
 *    state pointer, audit batches, effects and emits fold into the parent turn's
 *    buffer (`ctx.turn`) and land in the parent's single boundary commit, so a
 *    crash anywhere in the composed turn rolls the whole thing back together.
 *    Audit rows keep each machine's own name/owner meta, correlated by the shared
 *    turnId.
 * ════════════════════════════════════════════════════════════════════════════ */

/** What one machine gathered while stepping (also reported on its RunResult). */
interface Collected {
	readonly records: TransitionRecord[];
	readonly effects: FsmEffect[];
	readonly emits: FsmEmit[];
	readonly extraEntities: object[];
}

interface ChangeBatch {
	readonly sink: FsmChangeSink | undefined;
	readonly meta: FsmChangeMeta;
	readonly records: readonly TransitionRecord[];
}
interface EffectBatch {
	readonly sink: FsmEffectSink | undefined;
	readonly effects: readonly FsmEffect[];
}
interface EmitBatch {
	readonly sink: FsmEventSink | undefined;
	readonly emits: readonly FsmEmit[];
}

/**
 * The boundary buffer for ONE turn. The root run owns it and commits it; nested runs
 * fold their batches into it. Each batch keeps the sinks of the machine that produced
 * it, so nesting never changes which sink handles what.
 */
class FsmTurn implements FsmTurnHandle {
	readonly turnId = randomUUID();
	readonly changes: ChangeBatch[] = [];
	readonly effects: EffectBatch[] = [];
	readonly emits: EmitBatch[] = [];
	readonly entities: object[] = [];
}

export class FiniteStateMachine<E extends StateMachineEntityAbstractClass, K extends keyof E> {
	private readonly byName = new Map<string, AnyState>();
	private readonly maxSteps: number;
	private readonly debug: boolean;
	private readonly logger: Logger;
	private readonly tracer = new FsmTracer();
	constructor(private readonly cfg: StateMachineConfig<E, K>) {
		this.maxSteps = cfg.maxSteps ?? 1000;
		this.debug = cfg.debug ?? false;
		this.logger = new Logger(`Fsm:${cfg.fsmName}`);
		for (const state of Object.values(cfg.states) as AnyState[]) {
			if (this.byName.has(state.name)) {
				throw new Error(`[${cfg.fsmName}] duplicate state name "${state.name}"`);
			}
			this.byName.set(state.name, state);
		}
		this.validate();
	}

	/** Fail fast at construction (module init): every target/initial must be registered. */
	private validate() {
		if (!this.byName.has(this.cfg.initial)) {
			throw new Error(
				`[${this.cfg.fsmName}] initial state "${this.cfg.initial}" is not registered`,
			);
		}
		for (const state of Object.values(this.cfg.states) as AnyState[]) {
			for (const [action, target] of Object.entries(state.transitions)) {
				if (!this.byName.has(target)) {
					throw new Error(
						`[${this.cfg.fsmName}] ${state.name}.${action} → "${target}" is not a registered state`,
					);
				}
			}
			if (state.terminal && Object.keys(state.transitions).length > 0) {
				throw new Error(
					`[${this.cfg.fsmName}] terminal state "${state.name}" must have no transitions`,
				);
			}
		}
	}

	/**
	 * A milestone log line — the interpreter's *only* logging concern. Kept
	 * deliberately coarse: state entry, hook invocation, transitions, persistence,
	 * park/complete. The fine-grained, per-step detail lives in the trace (span
	 * events), NOT in the log. Gated by `debug` so a machine can opt out of the noise.
	 */
	private milestone(message: string): void {
		if (this.debug) this.logger.log(message);
	}

	/**
	 * Builds the step-scoped logger handed to hooks as `ctx.logger`, prefixed with
	 * entity + state so a hook's lines correlate. `log`/`debug` follow the `debug`
	 * gate (they are milestone-grade detail); `warn`/`error` always emit.
	 */
	private makeLogger(entity: E, stateName: string): FsmLogger {
		const prefix = `[${entity.id}@${stateName}]`;
		return {
			log: (m, ...meta) => {
				if (this.debug) this.logger.log(`${prefix} ${m}`, ...meta);
			},
			debug: (m, ...meta) => {
				if (this.debug) this.logger.debug(`${prefix} ${m}`, ...meta);
			},
			warn: (m, ...meta) => this.logger.warn(`${prefix} ${m}`, ...meta),
			error: (m, ...meta) => this.logger.error(`${prefix} ${m}`, ...meta),
		};
	}

	/**
	 * Drive the machine for one ROOT turn. Boots at the persisted durable state
	 * (onResume) if there is one, otherwise enters the initial state
	 * (afterTransitionIn), then steps through transient states until it parks or
	 * completes — all with NO open transaction — and finally commits the resting
	 * position + everything nested runs folded in, atomically.
	 *
	 * ROOT turns are serialized per aggregate: a row-level claim is taken up front
	 * (throws {@link FsmTurnInProgressError} before any agent work when another turn
	 * holds it), and the boundary commit is guarded by the fsmTurnSeq optimistic lock
	 * (throws {@link FsmTurnConflictError} and rolls the whole turn back if a
	 * concurrent turn slipped through a stale claim). Both errors mean "nothing
	 * happened — re-run shortly".
	 */
	async run(entity: E, em: EntityManager): Promise<RunResult> {
		const claim = await this.claim(entity, em);
		const bootSeq = entity.fsmTurnSeq ?? 0;
		const turn = new FsmTurn();
		try {
			const result = await this.driveTurn(entity, em, turn, false);
			await this.commit(entity, em, turn, { bootSeq, claim });
			return result;
		} catch (e) {
			if (claim.persisted) {
				// Best effort: an expired-and-stolen claim is someone else's now — the
				// release is guarded on OUR timestamp, so we never clear theirs.
				await this.releaseClaim(entity, em, claim).catch((releaseErr: unknown) => {
					this.logger.warn(
						`failed to release claim for ${entity.id}: ${String(releaseErr)}`,
					);
				});
			}
			throw e;
		}
	}

	/**
	 * Take the aggregate's root-turn claim, or prove the row is not persisted yet (a
	 * brand-new entity whose first turn will INSERT it — no concurrency possible).
	 * Stale claims (crashed turn) expire after claimTtlMs.
	 */
	private async claim(entity: E, em: EntityManager): Promise<{ at: Date; persisted: boolean }> {
		const at = new Date();
		const cutoff = new Date(at.getTime() - (this.cfg.claimTtlMs ?? 120_000));
		const entityClass = entity.constructor as new () => E;
		const affected = await em.nativeUpdate(
			entityClass,
			{
				id: entity.id,
				$or: [{ fsmClaimedAt: null }, { fsmClaimedAt: { $lt: cutoff } }],
			} as never,
			{ fsmClaimedAt: at } as never,
		);
		if (affected === 0) {
			const exists = await em.count(entityClass, { id: entity.id } as never);
			if (exists > 0) {
				this.milestone(`⛔ ${entity.id} claim rejected — a turn is already running`);
				throw new FsmTurnInProgressError(this.cfg.fsmName, entity.id);
			}
			return { at, persisted: false };
		}
		this.milestone(`🔒 ${entity.id} claimed for a root turn`);
		return { at, persisted: true };
	}

	/** Clear OUR claim (guarded on the timestamp we wrote) after a failed turn. */
	private async releaseClaim(entity: E, em: EntityManager, claim: { at: Date }): Promise<void> {
		const entityClass = entity.constructor as new () => E;
		await em.nativeUpdate(
			entityClass,
			{ id: entity.id, fsmClaimedAt: claim.at } as never,
			{ fsmClaimedAt: null } as never,
		);
	}

	/**
	 * Drive the machine as a CHILD of an in-flight turn. Steps exactly like `run`,
	 * but commits nothing: the child's state pointer, audit records, effects and
	 * emits fold into the parent turn's buffer (reached via `parentCtx.turn`) and
	 * land in the parent's single boundary commit.
	 */
	async runNested(entity: E, parentCtx: TransitionContext<any, Transitions>): Promise<RunResult> {
		const turn = parentCtx.turn;
		if (!(turn instanceof FsmTurn)) {
			throw new Error(
				`[${this.cfg.fsmName}] runNested received a foreign turn handle — pass the ctx of a running hook`,
			);
		}
		// The parent's boundary commit must persist the child's state pointer.
		turn.entities.push(entity as object);
		return this.driveTurn(entity, parentCtx.em, turn, true);
	}

	/** Shared root/nested turn body: boot, step to rest, fold what was gathered. */
	private async driveTurn(
		entity: E,
		em: EntityManager,
		turn: FsmTurn,
		nested: boolean,
	): Promise<RunResult> {
		const bootState = this.getState(entity) ?? this.cfg.initial;
		const collected: Collected = { records: [], effects: [], emits: [], extraEntities: [] };

		// One span per (sub-)turn: follows this entity from its first action until it
		// parks at a durable state (or completes). Child hook spans nest under it.
		return this.tracer.turn(
			{
				fsmName: this.cfg.fsmName,
				fsmVersion: this.cfg.fsmVersion,
				ownerType: this.cfg.ownerType,
				entityId: entity.id,
				bootState,
				turnId: turn.turnId,
			},
			async span => {
				this.milestone(
					`▶ ${entity.id} boot @ ${bootState} (turn ${turn.turnId}${nested ? ', nested' : ''})`,
				);

				const { state, status } = await this.step(entity, em, collected, turn);
				this.setState(entity, state.name);
				this.seedVersion(entity);
				this.fold(entity, collected, turn);

				span.setAttributes({
					'fsm.final_state': state.name,
					'fsm.status': status,
					'fsm.step_count': collected.records.length,
					'fsm.effect_count': collected.effects.length,
					'fsm.emit_count': collected.emits.length,
					'fsm.nested': nested,
				});
				this.milestone(
					`■ ${entity.id} ${status} @ ${state.name} — ${collected.records.length} step(s), ` +
						`${collected.effects.length} effect(s), ${collected.emits.length} emit(s)`,
				);

				return {
					status,
					state: state.name,
					turnId: turn.turnId,
					changes: collected.records,
					effects: collected.effects,
					emits: collected.emits,
				};
			},
		);
	}

	/** Hand this machine's gathered batches to the turn buffer, tagged with OUR sinks/meta. */
	private fold(entity: E, collected: Collected, turn: FsmTurn): void {
		turn.entities.push(...collected.extraEntities);
		if (collected.records.length > 0) {
			turn.changes.push({
				sink: this.cfg.changeSink,
				meta: {
					fsmName: this.cfg.fsmName,
					fsmVersion: this.cfg.fsmVersion,
					ownerType: this.cfg.ownerType,
					ownerId: entity.id,
					turnId: turn.turnId,
				},
				records: collected.records,
			});
		}
		if (collected.effects.length > 0) {
			turn.effects.push({ sink: this.cfg.effectSink, effects: collected.effects });
		}
		if (collected.emits.length > 0) {
			turn.emits.push({ sink: this.cfg.eventSink, emits: collected.emits });
		}
	}

	private async step(
		entity: E,
		em: EntityManager,
		collected: Collected,
		turn: FsmTurn,
	): Promise<{ state: AnyState; status: 'parked' | 'completed' }> {
		const persisted = this.getState(entity);
		let state: AnyState;
		let outcome: StepOutcome;

		if (persisted && this.byName.has(persisted)) {
			// Boot at the persisted pointer. Durable "awaiting" states define onResume to
			// re-derive readiness; a state persisted as its own initial value (no onResume)
			// falls back to its entry hook and just does the work.
			state = this.byName.get(persisted)!;
			if (state.terminal) {
				// A completed entity woken by a stray signal: terminal entry work already
				// ran when the machine transitioned in — never re-run it.
				this.milestone(`▪ ${entity.id} boot @ terminal ${state.name} — no-op`);
				return { state, status: 'completed' };
			}
			const hook = state.onResume ? 'onResume' : 'afterTransitionIn';
			outcome = await this.invoke(state, entity, em, undefined, hook, collected, turn);
		} else {
			state = this.byName.get(this.cfg.initial)!;
			outcome = await this.invoke(
				state,
				entity,
				em,
				undefined,
				'afterTransitionIn',
				collected,
				turn,
			);
		}

		return this.drive(state, outcome, entity, em, collected, turn);
	}

	private async drive(
		state: AnyState,
		outcome: StepOutcome,
		entity: E,
		em: EntityManager,
		collected: Collected,
		turn: FsmTurn,
	): Promise<{ state: AnyState; status: 'parked' | 'completed' }> {
		for (let steps = 0; steps < this.maxSteps; steps++) {
			if (outcome.kind === 'park') {
				this.milestone(`⏸ ${entity.id} parked @ ${state.name}`);
				this.tracer.event('parked', { 'fsm.state': state.name });
				return { state, status: 'parked' };
			}

			const next = this.byName.get(outcome.target);
			if (!next) {
				throw new Error(
					`[${state.name}] dispatched to an unregistered target "${outcome.target}"`,
				);
			}

			collected.records.push({
				from: state.name,
				to: next.name,
				action: outcome.action,
				params: outcome.payload,
				kind: next.durable || next.terminal ? 'durable' : 'transient',
			});
			this.milestone(`${entity.id} ${state.name} —${outcome.action}→ ${next.name}`);
			this.tracer.event('transition', {
				'fsm.from': state.name,
				'fsm.to': next.name,
				'fsm.action': outcome.action,
			});

			if (next.terminal) {
				await this.invoke(
					next,
					entity,
					em,
					outcome.payload,
					'afterTransitionIn',
					collected,
					turn,
				);
				return { state: next, status: 'completed' };
			}

			state = next;
			outcome = await this.invoke(
				state,
				entity,
				em,
				outcome.payload,
				'afterTransitionIn',
				collected,
				turn,
			);
		}
		throw new Error(
			`Machine "${this.cfg.fsmName}" exceeded maxSteps (${this.maxSteps}) — transient cycle?`,
		);
	}

	private async invoke(
		state: AnyState,
		entity: E,
		em: EntityManager,
		input: unknown,
		hook: 'afterTransitionIn' | 'onResume',
		collected: Collected,
		turn: FsmTurn,
	): Promise<StepOutcome> {
		const fn = state[hook];
		if (!fn) return { kind: 'park' }; // no hook → a pure durable resting point
		this.milestone(`${entity.id} ${hook} @ ${state.name}`);
		return this.tracer.hook(state.name, hook, entity.id, async () => {
			const ctx = this.makeCtx(state, entity, em, input, collected, turn);
			const result = await fn.call(state, ctx);
			return result ?? { kind: 'park' };
		});
	}

	private makeCtx(
		state: AnyState,
		entity: E,
		em: EntityManager,
		input: unknown,
		collected: Collected,
		turn: FsmTurn,
	): TransitionContext<E, Transitions> {
		return {
			entity,
			em,
			input,
			turn,
			logger: this.makeLogger(entity, state.name),
			dispatch: (action, ...payload) => {
				const target = state.transitions[action.name];
				if (!target) {
					throw new Error(`[${state.name}] cannot dispatch "${action.name}"`);
				}
				return { kind: 'transition', target, action: action.name, payload: payload[0] };
			},
			park: () => ({ kind: 'park' }),
			publish: (name, event) => {
				this.tracer.event('publish queued', { 'fsm.effect_name': name });
				collected.effects.push({ kind: 'publish', name, event });
			},
			sendJob: (name, job) => {
				this.tracer.event('job queued', { 'fsm.effect_name': name });
				collected.effects.push({ kind: 'job', name, job });
			},
			emit: (name, event) => {
				this.tracer.event('emit queued', { 'fsm.emit_name': name });
				collected.emits.push({ name, event });
			},
			persist: e => {
				const entities = Array.isArray(e) ? e : [e];
				collected.extraEntities.push(...entities);
				this.tracer.event('persist queued', { 'fsm.entity_count': entities.length });
			},
			findTransitions: (query = {}) =>
				this.findTransitions(entity, em, collected, turn, query),
			latestTransition: async (query = {}) => {
				const [latest] = await this.findTransitions(entity, em, collected, turn, {
					...query,
					limit: 1,
				});
				return latest;
			},
		};
	}

	/**
	 * Read the entity's audit trail through the change sink's read side (newest first),
	 * optionally prepending the RUNNING turn's not-yet-committed edges.
	 */
	private async findTransitions(
		entity: E,
		em: EntityManager,
		collected: Collected,
		turn: FsmTurn,
		query: FsmTransitionQuery,
	): Promise<RecordedTransition[]> {
		const sink = this.cfg.changeSink;
		if (!sink?.find) {
			throw new Error(
				`[${this.cfg.fsmName}] ctx.findTransitions needs a change sink with read support (changeSink.find)`,
			);
		}
		const committed = await sink.find(
			em,
			{
				fsmName: this.cfg.fsmName,
				ownerType: this.cfg.ownerType,
				ownerId: entity.id,
			},
			query,
		);
		if (!query.includePending) {
			return committed;
		}

		const merged = [...this.pendingTransitions(entity, collected, turn, query), ...committed];
		return query.limit === undefined ? merged : merged.slice(0, query.limit);
	}

	/**
	 * The RUNNING turn's in-memory edges for this machine + entity, newest first:
	 * the current run's records, plus any batches an earlier nested run of the same
	 * entity already folded into this root turn.
	 */
	private pendingTransitions(
		entity: E,
		collected: Collected,
		turn: FsmTurn,
		query: FsmTransitionQuery,
	): RecordedTransition[] {
		const now = new Date();
		const asPending = (record: TransitionRecord, turnStep: number): RecordedTransition => ({
			...record,
			turnId: turn.turnId,
			turnStep,
			createdAt: now,
			pending: true,
		});

		const folded = turn.changes
			.filter(
				batch =>
					batch.meta.fsmName === this.cfg.fsmName &&
					batch.meta.ownerType === this.cfg.ownerType &&
					batch.meta.ownerId === entity.id,
			)
			.flatMap(batch => batch.records.map(asPending));
		const own = collected.records.map(asPending);

		// Chronological is folded-then-own (folds happened earlier this turn); flip for
		// the newest-first contract shared with the committed read.
		return [...folded, ...own]
			.filter(
				record =>
					(query.action === undefined || record.action === query.action) &&
					(query.from === undefined || record.from === query.from) &&
					(query.to === undefined || record.to === query.to),
			)
			.reverse();
	}

	/**
	 * The resting boundary: ONE short transaction that atomically writes the state
	 * pointer(s), the audit rows and the queued pg-boss effects — including every
	 * batch a nested run folded into this turn. No agent/LLM work runs in here — it
	 * has all already happened during the (tx-free) stepping above.
	 *
	 * The commit is fenced by the fsmTurnSeq optimistic lock: it only lands when the
	 * row still carries the seq this turn booted with, otherwise the whole turn —
	 * pointers, audit rows, effects, nested batches — rolls back together.
	 */
	private async commit(
		entity: E,
		em: EntityManager,
		turn: FsmTurn,
		root: { bootSeq: number; claim: { at: Date; persisted: boolean } },
	): Promise<void> {
		const recordCount = turn.changes.reduce((n, b) => n + b.records.length, 0);
		const effectCount = turn.effects.reduce((n, b) => n + b.effects.length, 0);
		const emitCount = turn.emits.reduce((n, b) => n + b.emits.length, 0);
		this.milestone(
			`↯ ${entity.id} persisting: ${recordCount} change(s), ${effectCount} effect(s), ` +
				`${turn.entities.length} extra entit(ies)`,
		);
		this.tracer.event('commit', {
			'fsm.change_count': recordCount,
			'fsm.effect_count': effectCount,
			'fsm.emit_count': emitCount,
		});
		await em.transactional(async tem => {
			if (root.claim.persisted) {
				// Seq fence + claim release in one row-locking UPDATE. A concurrent
				// committer waits on the row lock and then misses the WHERE → conflict.
				const affected = await tem.nativeUpdate(
					entity.constructor as new () => E,
					{ id: entity.id, fsmTurnSeq: root.bootSeq } as never,
					{ fsmTurnSeq: root.bootSeq + 1, fsmClaimedAt: null } as never,
				);
				if (affected === 0) {
					throw new FsmTurnConflictError(this.cfg.fsmName, entity.id);
				}
			}
			// Keep the in-memory entity aligned so the flush below writes the same
			// values (or, for a brand-new row, the INSERT carries them directly).
			entity.fsmTurnSeq = root.bootSeq + 1;
			entity.fsmClaimedAt = null;

			tem.persist(entity as object);
			for (const e of turn.entities) {
				tem.persist(e);
			}

			for (const batch of turn.changes) {
				if (batch.sink) {
					await batch.sink.record(tem, batch.records, batch.meta);
				}
			}

			await tem.flush();

			for (const batch of turn.effects) {
				if (!batch.sink) continue;
				for (const effect of batch.effects) {
					if (effect.kind === 'publish') {
						await batch.sink.publish(tem, effect.name, effect.event);
					} else {
						await batch.sink.sendJob(tem, effect.name, effect.job);
					}
				}
			}
		});

		// In-memory events fire LAST — only after the DB transaction has committed, so
		// consumers never observe rolled-back state (and can re-read committed data).
		for (const batch of turn.emits) {
			if (!batch.sink) continue;
			for (const { name, event } of batch.emits) {
				batch.sink.emit(name, event);
			}
		}
	}

	private seedVersion(entity: E): void {
		const e = entity as { fsmVersion?: number };
		if (e.fsmVersion == null) {
			e.fsmVersion = this.cfg.fsmVersion;
		} else if (e.fsmVersion !== this.cfg.fsmVersion) {
			// v-mismatch handling (migrate / branch) is a later concern; surface it for now.
			this.logger.warn(
				`entity ${entity.id} at fsmVersion ${e.fsmVersion}, machine is ${this.cfg.fsmVersion}`,
			);
		}
	}

	private getState(entity: E): string | null | undefined {
		return (entity as Record<string, unknown>)[this.cfg.stateField as string] as
			string | null | undefined;
	}

	private setState(entity: E, name: string): void {
		(entity as Record<string, unknown>)[this.cfg.stateField as string] = name;
	}
}
