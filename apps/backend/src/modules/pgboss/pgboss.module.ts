import {
	BeforeApplicationShutdown,
	DynamicModule,
	Global,
	Inject,
	Logger,
	Module,
	OnApplicationBootstrap,
} from '@nestjs/common';
import { MetadataScanner } from '@nestjs/core';

import { PgBoss } from 'pg-boss';
import { defer, lastValueFrom } from 'rxjs';

import { LOGGER, PGBOSS_OPTIONS, PGBOSS_TOKEN } from './constants/pgboss.constant.js';
import {
	PgBossModuleAsyncOptions,
	PgBossModuleOptions,
	PgBossOptionsFactory,
} from './interfaces/pgboss-module-options.interface.js';
import { handleRetry } from './utils/handle-retry.js';
import { HandlerScannerService } from './handler-scanner.service.js';
import { PgBossService } from './pgboss.service.js';
import { SubscriberRegistry } from './subscriber-registry.service.js';

@Global()
@Module({
	providers: [MetadataScanner, HandlerScannerService, SubscriberRegistry],
})
export class PgBossModule implements OnApplicationBootstrap, BeforeApplicationShutdown {
	private readonly logger = new Logger(LOGGER);

	constructor(
		@Inject(PGBOSS_TOKEN) private readonly boss: PgBoss,
		private readonly handlerScannerService: HandlerScannerService,
	) {
		this.boss.on('error', (error: Error) => {
			this.logger.error(`PgBoss error: ${error.message}`, error.stack);
		});
	}

	static forRootAsync(options: PgBossModuleAsyncOptions): DynamicModule {
		const logger = new Logger(LOGGER);

		const pgBossProvider = {
			provide: PGBOSS_TOKEN,
			inject: [PGBOSS_OPTIONS],
			useFactory: async (pgBossOptions: PgBossModuleOptions) => {
				const boss = await lastValueFrom(
					defer(() => new PgBoss(pgBossOptions).start()).pipe(
						handleRetry(pgBossOptions.retryLimit, pgBossOptions.retryDelay),
					),
				);
				logger.log('PgBoss started successfully');
				return boss;
			},
		};

		const asyncProviders = this.createAsyncProviders(options);

		return {
			module: PgBossModule,
			imports: options.imports || [],
			providers: [
				...asyncProviders,
				pgBossProvider,
				SubscriberRegistry,
				PgBossService,
				HandlerScannerService,
				MetadataScanner,
			],
			exports: [PgBossService, PGBOSS_TOKEN],
		};
	}

	private static createAsyncProviders(options: PgBossModuleAsyncOptions) {
		if (options.useExisting || options.useFactory) {
			return [this.createAsyncOptionsProvider(options)];
		}

		const useClass = options.useClass as new (...args: unknown[]) => PgBossOptionsFactory;

		return [this.createAsyncOptionsProvider(options), { provide: useClass, useClass }];
	}

	private static createAsyncOptionsProvider(options: PgBossModuleAsyncOptions) {
		if (options.useFactory) {
			return {
				provide: PGBOSS_OPTIONS,
				useFactory: options.useFactory,
				inject: options.inject || [],
			};
		}

		const inject = [(options.useClass || options.useExisting)!];

		return {
			provide: PGBOSS_OPTIONS,
			useFactory: async (optionsFactory: PgBossOptionsFactory) =>
				optionsFactory.createPgBossOptions(),
			inject,
		};
	}

	async onApplicationBootstrap(): Promise<void> {
		await this.handlerScannerService.scanAndRegisterHandlers();
	}

	async beforeApplicationShutdown(signal?: string): Promise<void> {
		this.logger.log(`Stopping pg-boss (signal: ${signal})...`);
		try {
			if (this.boss) {
				await this.boss.stop({ graceful: true, timeout: 30_000 });
				this.logger.log('pg-boss stopped gracefully');
			}
		} catch (e) {
			this.logger.error(e);
		}
	}
}
