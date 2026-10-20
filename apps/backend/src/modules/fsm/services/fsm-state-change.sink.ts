import { EntityManager } from '@mikro-orm/core';

import { Injectable } from '@nestjs/common';

import { FsmStateChange } from '../entities/fsm-state-change.entity.js';
import {
	FsmChangeMeta,
	FsmChangeSink,
	FsmTransitionQuery,
	RecordedTransition,
	TransitionRecord,
} from '../types/fsm.types.js';

/**
 * Default {@link FsmChangeSink}: maps the turn's transition records to
 * {@link FsmStateChange} rows and persists them within the boundary transaction.
 * Also implements the read side, making the audit trail a queryable store for
 * `ctx.findTransitions` / `ctx.latestTransition`.
 */
@Injectable()
export class FsmStateChangeSink implements FsmChangeSink {
	async record(
		em: EntityManager,
		records: readonly TransitionRecord[],
		meta: FsmChangeMeta,
	): Promise<void> {
		for (const [turnStep, record] of records.entries()) {
			const row = em.create(FsmStateChange, {
				fsmName: meta.fsmName,
				fsmVersion: meta.fsmVersion,
				ownerType: meta.ownerType,
				ownerId: meta.ownerId,
				turnId: meta.turnId,
				turnStep,
				fromState: record.from,
				toState: record.to,
				action: record.action,
				params: record.params ?? null,
				kind: record.kind,
			});
			em.persist(row);
		}
	}

	async find(
		em: EntityManager,
		owner: { fsmName: string; ownerType: string; ownerId: string },
		query: FsmTransitionQuery,
	): Promise<RecordedTransition[]> {
		const rows = await em.find(
			FsmStateChange,
			{
				fsmName: owner.fsmName,
				ownerType: owner.ownerType,
				ownerId: owner.ownerId,
				...(query.action !== undefined && { action: query.action }),
				...(query.from !== undefined && { fromState: query.from }),
				...(query.to !== undefined && { toState: query.to }),
			},
			{
				orderBy: [{ createdAt: 'desc' }, { turnStep: 'desc' }],
				limit: query.limit,
			},
		);
		return rows.map(row => ({
			from: row.fromState,
			to: row.toState,
			action: row.action,
			params: row.params ?? null,
			kind: row.kind,
			turnId: row.turnId,
			turnStep: row.turnStep,
			createdAt: row.createdAt,
		}));
	}
}
