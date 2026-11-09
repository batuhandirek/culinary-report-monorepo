import { MikroOrmModule } from '@mikro-orm/nestjs';

import {
	BeforeApplicationShutdown,
	DynamicModule,
	Global,
	Inject,
	Logger,
	Module,
	OnModuleInit,
} from '@nestjs/common';

import { DBOS, type DLogger } from '@dbos-inc/dbos-sdk';

import { mainConfig } from 'src/config/main.config.js';
import { AuthModule } from 'src/modules/auth/auth.module.js';
import { User } from 'src/modules/auth/entities/user.entity.js';
import { UserSession } from 'src/modules/auth/entities/user-session.entity.js';

import { durableWorkflowsConfig } from './config/durable-workflows.config.js';
import {
	DURABLE_WORKFLOWS_LOGGER,
	DURABLE_WORKFLOWS_OPTIONS,
	SHUTDOWN_DRAIN_MS,
} from './constants/durable-workflows.constant.js';
import { AdminWorkflowsController } from './controllers/admin.workflows.controller.js';
import type { DurableWorkflowsModuleOptions } from './interfaces/durable-workflows.interface.js';
import { definedDurableQueues } from './queues/define-durable-queue.js';
import { DurablePriorityService } from './services/durable-priority.service.js';
import { DurableQueueMovesService } from './services/durable-queue-moves.service.js';
import { DurableRegistry } from './services/durable-registry.service.js';
import { DurableRunTreeService } from './services/durable-run-tree.service.js';
import { DurableWorkflowsService } from './services/durable-workflows.service.js';
import { WorkflowScannerService } from './services/workflow-scanner.service.js';

const LEVELS = ['debug', 'info', 'warn', 'error'];

/** DBOS's log lines through Nest's logger, from `level` up */
const nestLogger = (logger: Logger, level: string): DLogger => {
	const floor = Math.max(0, LEVELS.indexOf(level));
	const text = (entry: unknown) =>
		typeof entry === 'string' ? entry
		: entry instanceof Error ? entry.message
		: JSON.stringify(entry);
	return {
		debug: entry => floor <= 0 && logger.debug(text(entry)),
		info: entry => floor <= 1 && logger.log(text(entry)),
		warn: entry => floor <= 2 && logger.warn(text(entry)),
		error: entry => logger.error(text(entry)),
	};
};

/** The app's own database, as a URL for DBOS (its tables live in their own schema there) */
const appDatabaseUrl = (): string => {
	const auth = `${encodeURIComponent(mainConfig.DB_USERNAME)}:${encodeURIComponent(mainConfig.DB_PASSWORD ?? '')}`;
	const ssl = mainConfig.DB_SSL ? '?sslmode=no-verify' : '';
	return `postgresql://${auth}@${mainConfig.DB_HOST}:${mainConfig.DB_PORT}/${encodeURIComponent(mainConfig.DB_NAME)}${ssl}`;
};

/** The module's settings from the env; `forRoot` overrides take precedence */
export const durableWorkflowsOptionsFromEnv = (): DurableWorkflowsModuleOptions => ({
	applicationName:
		durableWorkflowsConfig.DBOS_APPLICATION_NAME ?? `munchwerk-${mainConfig.NODE_ENV}`,
	applicationVersion: durableWorkflowsConfig.DBOS_APPLICATION_VERSION,
	systemDatabaseUrl: durableWorkflowsConfig.DBOS_SYSTEM_DATABASE_URL ?? appDatabaseUrl(),
	schema: durableWorkflowsConfig.DBOS_SCHEMA,
	poolSize: durableWorkflowsConfig.DBOS_POOL_SIZE,
	disabled: durableWorkflowsConfig.DURABLE_WORKFLOWS_DISABLED,
	schedulesEnabled: !mainConfig.INGESTION_IS_DISABLED,
	tracingEnabled: mainConfig.OTEL_IS_ENABLED,
	logLevel: durableWorkflowsConfig.DBOS_LOG_LEVEL,
});

/**
 * Durable workflows on DBOS (`@dbos-inc/dbos-sdk`), the engine under every multi-step job that
 * spends money or waits: a reading pass, the backlog drain, and every LLM call (`LlmWorkflows` in
 * the LLM module, through `DurableLlmService`) and Apify run (`ApifyWorkflows` in the Apify module,
 * through `ApifyService.runActor`) as a workflow of its own on the `llm` and `apify` queues. The
 * engine only: the workflows live with their own modules. Global, like `PgBossModule`: inject
 * `DurableWorkflowsService` anywhere; pg-boss keeps the fire-and-forget side effects (an e-mail,
 * a notification).
 *
 * At `onModuleInit` (every provider built; Nest runs a global module's init before the other
 * modules', so their own `onModuleInit` has not run yet) the scanner registers every decorated method with DBOS, DBOS is launched
 * (recovering the runs a restart cut short), the declared queues are registered and the
 * `@DurableSchedule`s written. So: never start a workflow from an `onModuleInit`; from
 * `onApplicationBootstrap` on is fine.
 */
@Global()
@Module({})
export class DurableWorkflowsModule implements OnModuleInit, BeforeApplicationShutdown {
	private readonly logger = new Logger(DURABLE_WORKFLOWS_LOGGER);

	constructor(
		@Inject(DURABLE_WORKFLOWS_OPTIONS) private readonly options: DurableWorkflowsModuleOptions,
		private readonly scanner: WorkflowScannerService,
		private readonly service: DurableWorkflowsService,
		private readonly priority: DurablePriorityService,
		private readonly registry: DurableRegistry,
		private readonly runTree: DurableRunTreeService,
	) {}

	/**
	 * `overrides` on top of the env (`DurableWorkflowsConfig`). `minimal: true` is the engine alone,
	 * for a test module: no `/admin/workflows` controller (and its auth dependencies).
	 */
	static forRoot(
		overrides: Partial<DurableWorkflowsModuleOptions> = {},
		{ minimal = false }: { minimal?: boolean } = {},
	): DynamicModule {
		return {
			module: DurableWorkflowsModule,
			imports: minimal ? [] : [MikroOrmModule.forFeature([User, UserSession]), AuthModule],
			controllers: minimal ? [] : [AdminWorkflowsController],
			providers: [
				{
					provide: DURABLE_WORKFLOWS_OPTIONS,
					useFactory: () => ({ ...durableWorkflowsOptionsFromEnv(), ...overrides }),
				},
				DurableRegistry,
				DurablePriorityService,
				DurableQueueMovesService,
				DurableRunTreeService,
				WorkflowScannerService,
				DurableWorkflowsService,
			],
			exports: [DurableWorkflowsService, DurableRegistry],
		};
	}

	async onModuleInit(): Promise<void> {
		if (this.options.disabled) {
			this.logger.warn('DURABLE_WORKFLOWS_DISABLED: nothing durable runs in this process');
			return;
		}
		this.scanner.scan();
		await this.runBeforeLaunch();
		// A version name must be unique across every application sharing a system database (a dev
		// database cloned from production carries production's application too), so it carries the name
		const applicationVersion = `${this.options.applicationName}-${this.options.applicationVersion}`;
		DBOS.setConfig({
			name: this.options.applicationName,
			applicationVersion,
			systemDatabaseUrl: this.options.systemDatabaseUrl,
			systemDatabaseSchemaName: this.options.schema ?? 'dbos',
			systemDatabasePoolSize: this.options.poolSize ?? 5,
			useListenNotify: this.options.useListenNotify ?? true,
			tracingEnabled: this.options.tracingEnabled ?? false,
			logger: nestLogger(this.logger, this.options.logLevel ?? 'warn'),
			runAdminServer: false,
		});
		await DBOS.launch();
		this.service.markLaunched();
		const expectedQueues = new Set<string>();
		for (const queue of definedDurableQueues()) {
			const name = this.service.qualifiedQueueName(queue.name);
			expectedQueues.add(name);
			await DBOS.registerQueue(name, { ...queue.options, onConflict: 'always_update' });
		}
		// A queue no `defineDurableQueue` names any more goes, as pg-boss's orphan queues do
		for (const queue of await DBOS.listQueues()) {
			if (expectedQueues.has(queue.name)) continue;
			this.logger.log(`Removing orphan queue ${queue.name}`);
			await DBOS.deleteQueue(queue.name).catch(e =>
				this.logger.warn(`Could not remove queue ${queue.name}: ${(e as Error).message}`),
			);
		}
		await this.scanner.applySchedules(this.options.schedulesEnabled ?? true);
		if (!this.options.schedulesEnabled)
			this.logger.warn('Schedules not applied (INGESTION_IS_DISABLED)');
		this.logger.log(
			`DBOS launched as ${this.options.applicationName} (${applicationVersion}): ${this.service.registered().length} workflow(s), ${definedDurableQueues().length} queue(s)`,
		);
	}

	/** The `@BeforeDurableLaunch()` methods, one after the other; a failed one is logged, never stops the boot */
	private async runBeforeLaunch(): Promise<void> {
		for (const hook of this.registry.beforeLaunch) {
			try {
				await hook.run();
			} catch (e) {
				this.logger.error(`${hook.name} (before launch) failed: ${(e as Error).message}`);
			}
		}
	}

	async beforeApplicationShutdown(signal?: string): Promise<void> {
		if (!this.service.launched) return;
		this.logger.log(`Stopping DBOS (signal: ${signal})...`);
		try {
			// Workflows still running are left PENDING for the next process to resume
			await DBOS.shutdown({
				workflowCompletionTimeoutMS:
					mainConfig.NODE_ENV === 'production' ? SHUTDOWN_DRAIN_MS : 2_000,
			});
		} catch (e) {
			this.logger.error(`DBOS shutdown threw: ${(e as Error).message}`);
		}
		await this.priority.close().catch(() => undefined);
		await this.runTree.close().catch(() => undefined);
	}
}
