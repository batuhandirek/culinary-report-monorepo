import { Entity, Formula, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';

import { randomUUID } from 'node:crypto';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

/** One edge of the audit trail, as exposed by {@link StateMachineEntityAbstractClass.fsmTransitions}. */
export interface FsmTransitionEdge {
	fsmName: string;
	fsmVersion: number;
	turnId: string;
	turnStep: number;
	fromState: string;
	toState: string;
	action: string;
	params: unknown;
	kind: 'transient' | 'durable';
	/** ISO timestamp (jsonb rendering of the row's createdAt). */
	createdAt: string;
}

/**
 * Base class for any aggregate driven by a {@link StateMachine}. It carries the
 * cross-cutting bookkeeping the interpreter needs; the state pointer itself stays
 * on the concrete entity under a field of its choosing (the machine is told which
 * via `stateField`), so an entity can host more than one machine — e.g. an aggregate
 * keeps its listing lifecycle on `state` and its analysis machine on `analysisState`.
 */
@Entity({ abstract: true })
export abstract class StateMachineEntityAbstractClass<O = ''> extends MikroOrmEntityAbstractClass<
	O | 'fsmTurnSeq'
> {
	/**
	 * Client-generated (unlike the base's DB-generated default): an FSM aggregate must
	 * be addressable BEFORE anything is flushed — nested runs stamp `entity.id` on their
	 * audit-row meta and hooks filter relations by id, all mid-turn, and the whole turn
	 * only reaches the database at the boundary commit. `defaultRaw` is kept so the
	 * schema is unchanged and raw inserts (`em.insert`, SQL) still get a DB fallback.
	 */
	@PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
	override id: string = randomUUID();

	/** the machine version this entity is currently being driven under; seeded on first run. */
	@Property({ type: 'int', nullable: true })
	fsmVersion?: number;

	/**
	 * Monotonic ROOT-turn counter, the optimistic-lock token: a root turn snapshots it
	 * at boot and its boundary commit only lands via `... WHERE fsm_turn_seq = <boot>`.
	 * A turn that lost against a concurrent commit rolls back whole
	 * (FsmTurnConflictError) and can simply be re-run — turns re-derive everything
	 * from the winner's committed state.
	 */
	@Property({ type: 'int', default: 0 })
	fsmTurnSeq: number = 0;

	/**
	 * Set while a ROOT turn is in flight — its multi-second agent work runs outside any
	 * transaction, so this row-level claim is what serializes turns per aggregate.
	 * Cleared by the boundary commit (or the failure path); a crashed turn's stale
	 * claim expires after the machine's claimTtlMs.
	 */
	@Property({ type: 'datetime', nullable: true })
	fsmClaimedAt?: Date | null;

	/** free-form runtime annotations for the state tree (labels, deadlines, …). */
	@Property({ type: 'jsonb', nullable: true })
	fsmMeta?: Record<string, unknown>;

	/**
	 * The aggregate's full audit trail (its `fsm_state_changes` rows), oldest edge
	 * first. LAZY — never selected unless explicitly asked for via
	 * `populate: ['fsmTransitions']`, so ordinary queries pay nothing. When the entity
	 * hosts more than one machine, edges of ALL its machines are included, interleaved
	 * chronologically — filter by `fsmName` if you need one machine's view.
	 */
	@Formula(
		alias =>
			`(select coalesce(jsonb_agg(jsonb_build_object(
				'fsmName', c.fsm_name,
				'fsmVersion', c.fsm_version,
				'turnId', c.turn_id,
				'turnStep', c.turn_step,
				'fromState', c.from_state,
				'toState', c.to_state,
				'action', c.action,
				'params', c.params,
				'kind', c.kind,
				'createdAt', c.created_at
			) order by c.created_at, c.turn_step), '[]'::jsonb)
			from fsm_state_changes c
			where c.owner_id = ${alias}.id)`,
		{ type: 'json', lazy: true },
	)
	fsmTransitions?: FsmTransitionEdge[];
}
