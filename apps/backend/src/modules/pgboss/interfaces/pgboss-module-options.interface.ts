import { InjectionToken, ModuleMetadata, OptionalFactoryDependency, Type } from '@nestjs/common';

import { ConstructorOptions } from 'pg-boss';

export interface PgBossModuleOptions extends ConstructorOptions {
	retryLimit?: number;
	retryDelay?: number;
}

export interface PgBossOptionsFactory {
	createPgBossOptions(): Promise<PgBossModuleOptions> | PgBossModuleOptions;
}

export interface PgBossModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
	useExisting?: Type<PgBossOptionsFactory>;
	useClass?: Type<PgBossOptionsFactory>;
	useFactory?: (...args: unknown[]) => Promise<PgBossModuleOptions> | PgBossModuleOptions;
	inject?: (InjectionToken | OptionalFactoryDependency)[];
}
