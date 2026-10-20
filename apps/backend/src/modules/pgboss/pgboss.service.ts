import { EntityManager } from '@mikro-orm/core';

import { Inject, Injectable, Logger } from '@nestjs/common';

import _ from 'lodash';
import { Db, PgBoss, SendOptions, WorkOptions, WorkWithMetadataHandler } from 'pg-boss';

import { PGBOSS_TOKEN } from './constants/pgboss.constant.js';
import type { QueueSettings } from './interfaces/job-handler-options.type.js';
import { SubscriberRegistry } from './subscriber-registry.service.js';

function createDbAdapter(em: EntityManager): Db {
	return {
		executeSql: async (text: string, values?: unknown[]) => {
			// pg-boss uses $1, $2 style bindings; em.execute expects ? placeholders
			const sql = text.replace(/\$(\d+)/g, '?');
			const rows = await (em as any).execute(sql, values as any[], 'all');
			return { rows: Array.isArray(rows) ? rows : (rows?.rows ?? []) };
		},
	};
}

function getTransactionAdapter(em: EntityManager): Db {
	if (!em.getTransactionContext()) {
		throw new Error('EntityManager must be within a transaction');
	}
	return createDbAdapter(em);
}

@Injectable()
export class PgBossService {
	private logger = new Logger(PgBossService.name);
	private pgBoss: PgBoss;

	constructor(
		@Inject(PGBOSS_TOKEN) boss: PgBoss,
		private readonly subscriberRegistry: SubscriberRegistry,
	) {
		this.pgBoss = boss;
	}

	// --- Direct job queue (single consumer via @OnJob) ---
	async sendJob<TData extends object>(
		name: string,
		job: { payload: TData },
		options?: SendOptions,
	) {
		this.logger.debug(`Sending to ${name}`);
		await this.pgBoss.send(name, job.payload, options);
	}

	async sendJobWithEm<TData extends object>(
		em: EntityManager,
		name: string,
		job: { payload: TData },
		options?: Omit<SendOptions, 'db'>,
	) {
		this.logger.debug(`Sending to ${name}`);
		await this.pgBoss.send(name, job.payload, { ...options, db: getTransactionAdapter(em) });
	}

	// --- Fan-out events (multiple consumers via @OnPersistentEvent) ---
	async publish<TData extends object>(
		name: string,
		event: { payload: TData },
		options?: SendOptions,
	) {
		this.logger.debug(`Publishing to ${name}`);

		const subscribers = this.subscriberRegistry.getSubscribers(name);
		if (subscribers.length === 0) {
			this.logger.warn(`No subscribers for persistent event: ${name}`);
			return;
		}

		await Promise.all(
			subscribers.map(queueName => this.pgBoss.send(queueName, event.payload, options)),
		);
	}

	async publishWithEm<TData extends object>(
		em: EntityManager,
		name: string,
		event: { payload: TData },
		options?: Omit<SendOptions, 'db'>,
	) {
		this.logger.debug(`Publishing to ${name}`);
		const db = getTransactionAdapter(em);

		const subscribers = this.subscriberRegistry.getSubscribers(name);
		if (subscribers.length === 0) {
			this.logger.warn(`No subscribers for persistent event: ${name}`);
			return;
		}

		// Send to each subscriber within the MikroORM transaction.
		// Uses Promise.all (not allSettled) so errors propagate and trigger rollback.
		await Promise.all(
			subscribers.map(queueName =>
				this.pgBoss.send(queueName, event.payload, { ...options, db }),
			),
		);
	}

	/**
	 * `publishWithEm` for a whole batch: one `insert` per subscriber queue instead of one
	 * `send` per event. A single listing activation can produce hundreds of matches, and a
	 * round trip each is the cost this avoids — the jobs are otherwise identical to the
	 * ones `publishWithEm` writes.
	 */
	async publishManyWithEm<TData extends object>(
		em: EntityManager,
		name: string,
		events: { payload: TData }[],
	) {
		if (events.length === 0) return;
		this.logger.debug(`Publishing ${events.length} event(s) to ${name}`);
		const db = getTransactionAdapter(em);

		const subscribers = this.subscriberRegistry.getSubscribers(name);
		if (subscribers.length === 0) {
			this.logger.warn(`No subscribers for persistent event: ${name}`);
			return;
		}

		const jobs = events.map(event => ({ data: event.payload }));
		await Promise.all(
			subscribers.map(queueName => this.pgBoss.insert(queueName, jobs, { db })),
		);
	}

	// --- Internal: used by HandlerScannerService ---
	async registerWorker<TData extends object>(
		queueName: string,
		handler: WorkWithMetadataHandler<TData>,
		options: { workOptions: WorkOptions; queueOptions: QueueSettings },
	) {
		await this.pgBoss.createQueue(queueName, options.queueOptions);
		await this.pgBoss
			.updateQueue(queueName, _.omit(options.queueOptions, 'policy'))
			.catch(e => {
				if (e?.code === 'ERR_ASSERTION') return;
				throw e;
			});
		await this.pgBoss.work<TData>(
			queueName,
			{ ...options.workOptions, includeMetadata: true },
			handler,
		);
	}

	async registerSubscription<TData extends object>(
		eventName: string,
		queueName: string,
		handler: WorkWithMetadataHandler<TData>,
		options: { workOptions: WorkOptions; queueOptions: QueueSettings },
	) {
		await this.pgBoss.createQueue(queueName, options.queueOptions);
		await this.pgBoss
			.updateQueue(queueName, _.omit(options.queueOptions, 'policy'))
			.catch(e => {
				if (e?.code === 'ERR_ASSERTION') return;
				throw e;
			});
		await this.pgBoss.subscribe(eventName, queueName);
		await this.pgBoss.work<TData>(
			queueName,
			{ ...options.workOptions, includeMetadata: true },
			handler,
		);
	}
}
