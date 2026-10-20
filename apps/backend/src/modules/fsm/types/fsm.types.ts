import { EntityManager } from '@mikro-orm/core';

import { StateMachineEntityAbstractClass } from '../abstractions/fsm-entity.abstract-class.js';

/* ════════════════════════════════════════════════════════════════════════════
 * FINITE STATE MACHINE — public types & action tokens
 *
 * The interpreter that consumes these lives in `state-machine.ts`; the design
 * rationale is documented there.
 * ════════════════════════════════════════════════════════════════════════════ */

type MaybePromise<T> = T | Promise<T>;

// ─────────────────────────────────────────────────────────────── Action tokens
/**
 * A typed action token. `name` is a string literal used both as the transition
 * key and at runtime; `P` is the (phantom) payload type carried by the action.
 */
export class ActionType<N extends string = string, P = void> {
	/** phantom — never read at runtime, exists only to carry the payload type */
	declare readonly __payload: P;
	constructor(public readonly name: N) {}
}

/** `defineAction<Payload>()('ActionName')` → a token whose dispatch requires that payload. */
export function defineAction<P = void>() {
	return <N extends string>(name: N): ActionType<N, P> => new ActionType<N, P>(name);
}

// ─────────────────────────────────────────────────────── State / context / result
/** action name → target state NAME. Plain strings ⇒ no type-level cycles, no thunks. */
export type Transitions = Readonly<Record<string, string>>;

/** What a hook returns: either move to another state, or park (persist + stop). */
export type StepOutcome =
	| {
			readonly kind: 'transition';
			readonly target: string;
			readonly action: string;
			readonly payload: unknown;
	  }
	| { readonly kind: 'park' };

/** A queued, not-yet-sent pg-boss side effect, flushed at the boundary commit. */
export type FsmEffect =
	| { readonly kind: 'publish'; readonly name: string; readonly event: { payload: object } }
	| { readonly kind: 'job'; readonly name: string; readonly job: { payload: object } };

/** A queued in-memory (EventEmitter2) event, emitted AFTER the boundary transaction commits. */
export interface FsmEmit {
	readonly name: string;
	readonly event: object;
}

/** One recorded transition edge (transient hops included). */
export interface TransitionRecord {
	readonly from: string;
	readonly to: string;
	readonly action: string;
	readonly params: unknown;
	/** 'durable' when the edge lands on a durable/terminal resting point, else 'transient'. */
	readonly kind: 'transient' | 'durable';
}

/** A transition as persisted by the change sink, read back through `ctx.findTransitions`. */
export interface RecordedTransition extends TransitionRecord {
	readonly turnId: string;
	readonly turnStep: number;
	/** For a pending edge this is approximate — the commit stamps the real value. */
	readonly createdAt: Date;
	/** true when the edge belongs to the RUNNING turn and has not been committed yet. */
	readonly pending?: boolean;
}

/** Filter for reading recorded edges back; fields are AND-combined. */
export interface FsmTransitionQuery {
	readonly action?: string;
	readonly from?: string;
	readonly to?: string;
	readonly limit?: number;
	/**
	 * Also surface the RUNNING turn's not-yet-committed edges (this machine + entity),
	 * newest first, ahead of the committed history; they carry `pending: true`. This is
	 * how a state reads a payload dispatched EARLIER IN THE SAME TURN — `ctx.input`
	 * only survives a single hop, and the database cannot see the running turn.
	 */
	readonly includePending?: boolean;
}

/**
 * A step-scoped logger. The interpreter hands one to every hook via `ctx.logger`,
 * prefixed with the entity + current state so lines from a run correlate. `log`/`debug`
 * are gated by the machine's `debug` flag; `warn`/`error` always emit. This is the
 * LOGGING seam only — distributed tracing (OTEL spans) is a separate concern handled
 * by the interpreter's tracer, never coupled into these log calls.
 */
export interface FsmLogger {
	log(message: string, ...meta: unknown[]): void;
	debug(message: string, ...meta: unknown[]): void;
	warn(message: string, ...meta: unknown[]): void;
	error(message: string, ...meta: unknown[]): void;
}

/**
 * Opaque handle to the running turn's boundary buffer. Hooks receive it as `ctx.turn`
 * and hand it to a child machine via `childFsm.runNested(entity, ctx)` so the child's
 * records/effects/entities commit atomically WITH the parent turn instead of owning
 * their own boundary. Internals live in the interpreter.
 */
export interface FsmTurnHandle {
	readonly turnId: string;
}

export interface TransitionContext<E, T extends Transitions> {
	/** The aggregate this machine drives. */
	readonly entity: E;
	/** Step-scoped logger (prefixed with entity + state); `log`/`debug` gated by `debug`. */
	readonly logger: FsmLogger;
	/** The unit-of-work for this turn. Owned by the top interpreter; children borrow it. */
	readonly em: EntityManager;
	/** This turn's boundary buffer — pass to `childFsm.runNested(entity, ctx)` to nest. */
	readonly turn: FsmTurnHandle;
	/**
	 * Payload handed in by the action that transitioned here. Fine for *transient*
	 * same-turn hops; durable states should re-read the entity instead, since an
	 * in-memory payload does not survive the persisted boundary.
	 */
	readonly input: unknown;

	/** Fire one of *this* state's allowed actions. Compile error otherwise. */
	dispatch<N extends Extract<keyof T, string>, P>(
		action: ActionType<N, P>,
		...payload: P extends void ? [] : [payload: P]
	): StepOutcome;

	/** Persist this (durable) state and end the turn, awaiting an external signal. */
	park(): StepOutcome;

	/** Enqueue a fan-out persistent event; sent transactionally at the boundary commit. */
	publish<D extends object>(name: string, event: { payload: D }): void;
	/** Enqueue a single-consumer job; sent transactionally at the boundary commit. */
	sendJob<D extends object>(name: string, job: { payload: D }): void;
	/** Enqueue an in-memory event; emitted AFTER the boundary transaction commits. */
	emit(name: string, event: object): void;
	/**
	 * Register entities created this turn so they are flushed in the boundary commit.
	 * Accepts a single entity or an array; arrays are flattened into the commit set.
	 */
	persist(entity: object | object[]): void;

	/**
	 * Read THIS entity's audit trail for THIS machine, newest edge first. The audit
	 * table is a first-class read model: durable states may re-derive from recorded
	 * edges — most usefully from a payload carried on an action (it lands in `params`).
	 * By default only edges of previously COMMITTED turns are visible (the running
	 * turn's records have not reached the database yet); pass `includePending: true`
	 * to also see the running turn's in-memory edges. Requires a change sink with
	 * read support — throws otherwise.
	 */
	findTransitions(query?: FsmTransitionQuery): Promise<RecordedTransition[]>;
	/** Convenience over {@link findTransitions}: the newest matching edge, if any. */
	latestTransition(query?: FsmTransitionQuery): Promise<RecordedTransition | undefined>;
}

/** The set of state names for a machine driven off field `K` of entity `E` (its enum). */
export type StateName<E, K extends keyof E> = E[K] & string;

/**
 * Context bound to one state's OWN transition table. In a state class, type the hook
 * param as `ctx: StateCtx<Entity, MyState>` (usually via a per-machine alias, e.g.
 * `ProductCtx<MyState>`) so `ctx.dispatch` only accepts that state's declared actions.
 * NOTE: `Ctx<this>` would read nicer but does not work — inside the class body `this`
 * stays polymorphic, so `keyof this['transitions']` never resolves and dispatch rejects
 * every action; the concrete class name is required.
 */
export type StateCtx<E, S extends { readonly transitions: Transitions }> = TransitionContext<
	E,
	S['transitions']
>;

/**
 * A node in the machine. Implementers are `@Injectable()` NestJS providers, generic
 * over the entity `E` and its state-pointer field `K` — so `name` and every transition
 * target are typed to that field's enum (`E[K]`), and a wrong/renamed state is a compile
 * error. Concrete states type their ctx param as `StateCtx<E, MyState>` (see above); the
 * interface keeps the wide `Transitions` type (method-param bivariance lets the
 * narrower override satisfy it).
 */
export interface StateNode<E extends StateMachineEntityAbstractClass, K extends keyof E> {
	readonly name: StateName<E, K>;
	/** transient (default) states are never persisted; durable ones are the resting points. */
	readonly durable?: boolean;
	/** terminal states end the run (Completed); they have no outgoing transitions. */
	readonly terminal?: boolean;
	readonly transitions: Readonly<Record<string, StateName<E, K>>>;
	/** arbitrary static annotations (label, user-visible, timeout, …) for later tooling. */
	readonly meta?: Readonly<Record<string, unknown>>;

	/** Runs when the loop transitions INTO this state this turn. */
	afterTransitionIn?(ctx: TransitionContext<E, Transitions>): MaybePromise<StepOutcome | void>;
	/** Runs when the interpreter BOOTS at this persisted (durable) state. */
	onResume?(ctx: TransitionContext<E, Transitions>): MaybePromise<StepOutcome | void>;
}

export type AnyState = StateNode<any, any>;

/**
 * Exhaustive state registry: every member of the state enum MUST map to its node,
 * keyed by the state name — so you can't forget a state or mis-key one.
 */
export type StateRegistry<E extends StateMachineEntityAbstractClass, K extends keyof E> = Record<
	StateName<E, K>,
	StateNode<E, K>
>;

export type RunResult = {
	readonly status: 'parked' | 'completed';
	readonly state: string;
	readonly turnId: string;
	readonly changes: readonly TransitionRecord[];
	readonly effects: readonly FsmEffect[];
	readonly emits: readonly FsmEmit[];
};

// ──────────────────────────────────────────────────────────────── Side-effect seams
/** Flushes queued pg-boss effects inside the boundary transaction. Kept out of the core. */
export interface FsmEffectSink {
	publish(em: EntityManager, name: string, event: { payload: object }): Promise<void>;
	sendJob(em: EntityManager, name: string, job: { payload: object }): Promise<void>;
}

/** Persists the transition audit rows inside the boundary transaction. */
export interface FsmChangeSink {
	record(
		em: EntityManager,
		records: readonly TransitionRecord[],
		meta: FsmChangeMeta,
	): Promise<void>;

	/**
	 * Optional read side — powers `ctx.findTransitions` / `ctx.latestTransition`.
	 * Returns matching edges of the given owner, newest first. A sink without it keeps
	 * the machine write-only; the ctx helpers throw.
	 */
	find?(
		em: EntityManager,
		owner: { fsmName: string; ownerType: string; ownerId: string },
		query: FsmTransitionQuery,
	): Promise<RecordedTransition[]>;
}

export interface FsmChangeMeta {
	readonly fsmName: string;
	readonly fsmVersion: number;
	readonly ownerType: string;
	readonly ownerId: string;
	readonly turnId: string;
}

/** Emits queued in-memory events AFTER the boundary transaction commits (never inside it). */
export interface FsmEventSink {
	emit(name: string, event: object): void;
}

export interface StateMachineConfig<E extends StateMachineEntityAbstractClass, K extends keyof E> {
	/** stable identity of this machine, stamped on every audit row. */
	readonly fsmName: string;
	/** bumped when the state graph changes; stamped on the entity and on audit rows. */
	readonly fsmVersion: number;
	/** the driven entity's type name, used as the audit row owner discriminator. */
	readonly ownerType: string;
	/** every state, keyed by name — exhaustive over the state enum. */
	readonly states: StateRegistry<E, K>;
	/** the STATE NAME the machine boots into for a fresh entity. */
	readonly initial: StateName<E, K>;
	/** which field on the entity holds this machine's state pointer (e.g. 'analysisState'). */
	readonly stateField: K;
	/** safety valve against a mis-wired transient cycle; default 1000. */
	readonly maxSteps?: number;
	/**
	 * How long a root-turn claim may sit before it is considered abandoned (crashed
	 * turn) and can be stolen; default 120 000 ms. Size it above the machine's worst
	 * honest turn (agent calls included).
	 */
	readonly claimTtlMs?: number;
	/** verbose lifecycle + step logging (`log`/`debug`); warnings/errors always emit. Default false. */
	readonly debug?: boolean;
	/** optional: persist transition audit rows. Absent → no audit (e.g. tests). */
	readonly changeSink?: FsmChangeSink;
	/** optional: flush queued pg-boss effects. Absent → effects returned but not sent. */
	readonly effectSink?: FsmEffectSink;
	/** optional: emit queued in-memory events after the commit. Absent → emits returned, not fired. */
	readonly eventSink?: FsmEventSink;
}
