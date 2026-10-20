import { EntityManager } from '@mikro-orm/core';

import { Injectable } from '@nestjs/common';

import { PgBossService } from 'src/modules/pgboss/pgboss.service.js';

import { FsmEffectSink } from '../types/fsm.types.js';

/**
 * Default {@link FsmEffectSink}: flushes the machine's queued effects through
 * pg-boss inside the boundary transaction, so events commit atomically with the
 * state pointer and audit rows.
 */
@Injectable()
export class PgBossFsmEffectSink implements FsmEffectSink {
	constructor(private readonly pgBoss: PgBossService) {}

	async publish(em: EntityManager, name: string, event: { payload: object }): Promise<void> {
		await this.pgBoss.publishWithEm(em, name, event);
	}

	async sendJob(em: EntityManager, name: string, job: { payload: object }): Promise<void> {
		await this.pgBoss.sendJobWithEm(em, name, job);
	}
}
