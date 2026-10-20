import { Entity, Index, Property } from '@mikro-orm/decorators/legacy';

import { MikroOrmEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-entity.abstract-class.js';

import { TransitionRecord } from '../types/fsm.types.js';

/**
 * Append-only audit of every transition a machine takes — transient hops included
 * (`kind` tells them apart). One row per edge, all rows of a turn share `turnId`,
 * written inside the turn's boundary transaction alongside the pointer + effects.
 */
@Entity({ tableName: 'fsm_state_changes' })
@Index({ properties: ['ownerType', 'ownerId', 'createdAt'] })
// Serves the `fsmTransitions` formula on StateMachineEntityAbstractClass, which filters
// by owner_id alone (the abstract base cannot know its subclass's ownerType).
@Index({ properties: ['ownerId', 'createdAt'] })
@Index({ properties: ['turnId'] })
export class FsmStateChange extends MikroOrmEntityAbstractClass {
	@Property({ type: 'text' })
	fsmName: string;

	@Property({ type: 'int' })
	fsmVersion: number;

	/** discriminator for the polymorphic owner (the aggregate's entity name). */
	@Property({ type: 'text' })
	ownerType: string;

	@Property({ type: 'uuid' })
	ownerId: string;

	/** groups every edge recorded within a single turn. */
	@Property({ type: 'uuid' })
	turnId: string;

	/**
	 * Position of this edge within its turn. Needed for deterministic ordering: every
	 * row of a turn shares the same `createdAt` (the boundary transaction's timestamp).
	 */
	@Property({ type: 'int', default: 0 })
	turnStep: number;

	@Property({ type: 'text' })
	fromState: string;

	@Property({ type: 'text' })
	toState: string;

	@Property({ type: 'text' })
	action: string;

	@Property({ type: 'jsonb', nullable: true })
	params?: unknown;

	@Property({ type: 'text' })
	kind: TransitionRecord['kind'];
}
