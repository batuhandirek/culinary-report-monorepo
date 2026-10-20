import { Inject, Injectable, Logger } from '@nestjs/common';
import { ModulesContainer, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper.js';

import { JobWithMetadata, PgBoss, WorkOptions, WorkWithMetadataHandler } from 'pg-boss';

import { LOGGER, PGBOSS_TOKEN } from './constants/pgboss.constant.js';
import { ON_BATCH_JOB_OPTIONS, ON_BATCH_JOB_QUEUE } from './decorators/on-batch-job.decorator.js';
import {
	ON_CRON_EXPRESSION,
	ON_CRON_OPTIONS,
	ON_CRON_QUEUE,
} from './decorators/on-cron.decorator.js';
import { ON_JOB_OPTIONS, ON_JOB_QUEUE } from './decorators/on-job.decorator.js';
import {
	ON_PERSISTENT_EVENT_NAME,
	ON_PERSISTENT_EVENT_OPTIONS,
} from './decorators/on-persistent-event.decorator.js';
import {
	BatchJobHandlerOptions,
	CronHandlerOptions,
	JobHandlerOptions,
	QueueSettings,
} from './interfaces/job-handler-options.type.js';
import { PgBossService } from './pgboss.service.js';
import { SubscriberRegistry } from './subscriber-registry.service.js';

type BatchHandlerFn = WorkWithMetadataHandler<object>;
type SingleHandlerFn = (job: JobWithMetadata<object>) => Promise<void>;

const QUEUE_OPTION_KEYS: (keyof QueueSettings)[] = [
	// Set when the queue is created: pg-boss can't change a queue's policy later
	'policy',
	'retryLimit',
	'retryDelay',
	'retryBackoff',
	'retryDelayMax',
	'expireInSeconds',
	'retentionSeconds',
	'deleteAfterSeconds',
];

function splitOptions(options: JobHandlerOptions): {
	workOptions: WorkOptions;
	queueOptions: QueueSettings;
} {
	const queueOptions: Record<string, unknown> = {};
	const workOptions: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(options)) {
		if (QUEUE_OPTION_KEYS.includes(key as keyof QueueSettings)) {
			queueOptions[key] = value;
		} else {
			workOptions[key] = value;
		}
	}

	return { workOptions: workOptions as WorkOptions, queueOptions: queueOptions as QueueSettings };
}

function wrapSingleHandler(handler: SingleHandlerFn): BatchHandlerFn {
	return (jobs: JobWithMetadata<object>[]) => handler(jobs[0]);
}

function wrapWithFailureLogging(
	handler: BatchHandlerFn,
	logger: Logger,
	queueName: string,
	handlerLabel: string,
): BatchHandlerFn {
	return async (jobs: JobWithMetadata<object>[]) => {
		try {
			return await handler(jobs);
		} catch (error) {
			const jobIds = jobs.map(j => j.id).join(',');
			const attempt = jobs[0]?.retryCount ?? 0;
			const payloads = jobs.map(j => j.data);
			logger.error(
				`pg-boss handler failed: ${handlerLabel} [queue=${queueName} jobs=${jobIds} attempt=${attempt}] ${(error as Error).message}`,
				{ err: error, queueName, handlerLabel, jobIds, attempt, payloads },
			);
			throw error;
		}
	};
}

@Injectable()
export class HandlerScannerService {
	private readonly logger = new Logger(LOGGER);
	private readonly expectedQueues = new Set<string>();
	private readonly expectedSchedules = new Set<string>();

	constructor(
		private readonly pgBossService: PgBossService,
		private readonly subscriberRegistry: SubscriberRegistry,
		private readonly reflector: Reflector,
		private readonly modulesContainer: ModulesContainer,
		@Inject(PGBOSS_TOKEN) private readonly pgBoss: PgBoss,
	) {}

	async scanAndRegisterHandlers() {
		for (const module of this.modulesContainer.values()) {
			const providers = [...module.providers.values()];

			for (const provider of providers) {
				await this.scanProvider(provider);
			}
		}

		await this.cleanupOrphans();
	}

	private async cleanupOrphans() {
		try {
			// Unschedule first so a schedule row never outlives its queue.
			const schedules = await this.pgBoss.getSchedules();
			for (const schedule of schedules) {
				if (this.expectedSchedules.has(schedule.name)) continue;

				this.logger.log(`Removing orphan pg-boss schedule: ${schedule.name}`);
				await this.pgBoss
					.unschedule(schedule.name, schedule.key)
					.catch(e =>
						this.logger.warn(
							`Failed to unschedule orphan ${schedule.name}: ${(e as Error).message}`,
						),
					);
			}

			const queues = await this.pgBoss.getQueues();
			for (const queue of queues) {
				if (queue.name.startsWith('__pgboss__')) continue;
				if (this.expectedQueues.has(queue.name)) continue;

				// For persistent-event queues, our naming is `${eventName}__${className}.${methodName}`.
				// Unsubscribe before deleting so we don't leave dangling rows in pgboss.subscription.
				const sepIndex = queue.name.indexOf('__');
				if (sepIndex > 0) {
					const eventName = queue.name.slice(0, sepIndex);
					await this.pgBoss
						.unsubscribe(eventName, queue.name)
						.catch(e =>
							this.logger.warn(
								`Failed to unsubscribe orphan ${eventName} -> ${queue.name}: ${(e as Error).message}`,
							),
						);
				}

				this.logger.log(`Removing orphan pg-boss queue: ${queue.name}`);
				await this.pgBoss
					.deleteQueue(queue.name)
					.catch(e =>
						this.logger.warn(
							`Failed to delete orphan queue ${queue.name}: ${(e as Error).message}`,
						),
					);
			}
		} catch (error) {
			this.logger.error(error, 'Error cleaning up orphan pg-boss queues');
		}
	}

	private async scanProvider(provider: InstanceWrapper) {
		const { instance } = provider;
		if (!instance || typeof instance !== 'object') return;

		const className = instance.constructor.name;
		const prototype = Object.getPrototypeOf(instance);
		const methodNames = Object.getOwnPropertyNames(prototype).filter(method => {
			if (method === 'constructor') return false;
			const descriptor = Object.getOwnPropertyDescriptor(prototype, method);
			return typeof descriptor?.value === 'function';
		});

		for (const methodName of methodNames) {
			const methodRef = (instance as Record<string, BatchHandlerFn>)[methodName];
			const boundHandler = methodRef.bind(instance) as BatchHandlerFn;
			const handlerLabel = `${className}.${methodName}`;

			try {
				const registeredAsJob = await this.tryRegisterJob(
					methodRef,
					boundHandler,
					handlerLabel,
				);
				if (registeredAsJob) continue;

				const registeredAsBatchJob = await this.tryRegisterBatchJob(
					methodRef,
					boundHandler,
					handlerLabel,
				);
				if (registeredAsBatchJob) continue;

				const registeredAsCron = await this.tryRegisterCron(
					methodRef,
					boundHandler,
					handlerLabel,
				);
				if (registeredAsCron) continue;

				await this.tryRegisterPersistentEvent(
					methodRef,
					boundHandler,
					className,
					methodName,
				);
			} catch (error) {
				this.logger.error(error, `Error registering handler ${handlerLabel}`);
			}
		}
	}

	private async tryRegisterJob(
		methodRef: BatchHandlerFn,
		boundHandler: BatchHandlerFn,
		handlerLabel: string,
	): Promise<boolean> {
		const queueName = this.reflector.get<string>(ON_JOB_QUEUE, methodRef);
		if (!queueName) return false;

		const options = this.reflector.get<JobHandlerOptions>(ON_JOB_OPTIONS, methodRef);
		const { workOptions, queueOptions } = splitOptions(options);
		const single = wrapSingleHandler(boundHandler as unknown as SingleHandlerFn);
		const handler = wrapWithFailureLogging(single, this.logger, queueName, handlerLabel);

		await this.pgBossService.registerWorker(queueName, handler, {
			workOptions: { ...workOptions, batchSize: 1 },
			queueOptions,
		});
		this.expectedQueues.add(queueName);
		this.logger.log(`Registered job worker: ${queueName}`);
		return true;
	}

	private async tryRegisterBatchJob(
		methodRef: BatchHandlerFn,
		boundHandler: BatchHandlerFn,
		handlerLabel: string,
	): Promise<boolean> {
		const queueName = this.reflector.get<string>(ON_BATCH_JOB_QUEUE, methodRef);
		if (!queueName) return false;

		const options = this.reflector.get<BatchJobHandlerOptions>(ON_BATCH_JOB_OPTIONS, methodRef);
		const { workOptions, queueOptions } = splitOptions(options);
		const handler = wrapWithFailureLogging(boundHandler, this.logger, queueName, handlerLabel);

		await this.pgBossService.registerWorker(queueName, handler, {
			workOptions,
			queueOptions,
		});
		this.expectedQueues.add(queueName);
		this.logger.log(
			`Registered batch job worker: ${queueName} (batchSize: ${workOptions.batchSize})`,
		);
		return true;
	}

	private async tryRegisterCron(
		methodRef: BatchHandlerFn,
		boundHandler: BatchHandlerFn,
		handlerLabel: string,
	): Promise<boolean> {
		const cronQueueName = this.reflector.get<string>(ON_CRON_QUEUE, methodRef);
		if (!cronQueueName) return false;
		const queueName = `cron.${cronQueueName}`;

		const cronExpression = this.reflector.get<string>(ON_CRON_EXPRESSION, methodRef);
		const { tz, ...handlerOptions } = this.reflector.get<CronHandlerOptions>(
			ON_CRON_OPTIONS,
			methodRef,
		);
		const { workOptions, queueOptions } = splitOptions(handlerOptions);
		const single = wrapSingleHandler(boundHandler as unknown as SingleHandlerFn);
		const handler = wrapWithFailureLogging(single, this.logger, queueName, handlerLabel);

		await this.pgBossService.registerWorker(queueName, handler, {
			workOptions: { ...workOptions, batchSize: 1 },
			queueOptions,
		});
		// Upserts: cron/tz changes take effect on the next deploy.
		await this.pgBoss.schedule(queueName, cronExpression, {}, { tz });

		this.expectedQueues.add(queueName);
		this.expectedSchedules.add(queueName);
		this.logger.log(`Registered cron worker: ${queueName} (${cronExpression})`);
		return true;
	}

	private async tryRegisterPersistentEvent(
		methodRef: BatchHandlerFn,
		boundHandler: BatchHandlerFn,
		className: string,
		methodName: string,
	): Promise<boolean> {
		const eventName = this.reflector.get<string>(ON_PERSISTENT_EVENT_NAME, methodRef);
		if (!eventName) return false;

		const options = this.reflector.get<JobHandlerOptions>(
			ON_PERSISTENT_EVENT_OPTIONS,
			methodRef,
		);
		const { workOptions, queueOptions } = splitOptions(options);
		const queueName = `${eventName}__${className}.${methodName}`;
		const handlerLabel = `${className}.${methodName}`;
		const single = wrapSingleHandler(boundHandler as unknown as SingleHandlerFn);
		const handler = wrapWithFailureLogging(single, this.logger, queueName, handlerLabel);

		await this.pgBossService.registerSubscription(eventName, queueName, handler, {
			workOptions: { ...workOptions, batchSize: 1 },
			queueOptions,
		});

		this.subscriberRegistry.register(eventName, queueName);
		this.expectedQueues.add(queueName);

		this.logger.log(`Registered persistent event handler: ${queueName}`);
		return true;
	}
}
