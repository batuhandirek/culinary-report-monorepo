import { MikroOrmModule } from '@mikro-orm/nestjs';
import { defineConfig, MikroORM, Options } from '@mikro-orm/postgresql';

import { Provider } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { describe, jest } from '@jest/globals';

import ormConfig from 'src/mikro-orm.config.js';
import { DurableWorkflowsModule } from 'src/modules/durable-workflows/durable-workflows.module.js';

/** The Postgres DBOS runs on in a `durable: true` suite; unset, such suites skip (`describeWithDbos`) */
export const DBOS_TEST_DATABASE_URL = process.env.DBOS_TEST_DATABASE_URL;
/** `describe` for a suite that boots DBOS, skipped without `DBOS_TEST_DATABASE_URL` */
export const describeWithDbos: typeof describe.skip =
	DBOS_TEST_DATABASE_URL ? describe : describe.skip;

import { mockAgent } from './mock-agent.js';
import { buildSchemaSkippingIndexes, startPglite } from './pglite-orm.js';

/**
 * One-liner NestJS testing module backed by in-process Postgres (pglite).
 *
 * You declare only the providers under test; everything else is handled:
 *  - a pglite MikroORM wired via `MikroOrmModule.forRoot`/`forFeature`, so every entity
 *    repository resolves exactly as it does in the app (correct injection tokens),
 *  - the full app schema built on it (indexes skipped),
 *  - every remaining dependency (external services, gateways, …) auto-mocked via
 *    `useMocker`; agent tokens (`*Agent`) get {@link mockAgent} so `.generate()` returns
 *    `{ object }`.
 *
 * Mocks you assert on should be provided explicitly in `providers` (guaranteed instance
 * identity); `useMocker` only fills the incidental long tail.
 */
export interface PgliteTestingModule {
	moduleRef: Awaited<ReturnType<ReturnType<typeof Test.createTestingModule>['compile']>>;
	orm: MikroORM;
	stop: () => Promise<void>;
}

/** Auto-mock for any dependency not explicitly provided (and not a real repo/EM). */
const autoMock = (token: unknown): unknown => {
	const name = typeof token === 'function' ? token.name : String(token);
	if (name.endsWith('Agent')) return mockAgent({});
	const members = new Map<string | symbol, jest.Mock>();
	return new Proxy(
		{},
		{
			get: (_t, prop) => {
				// Never look thenable/iterable, or Nest awaiting the provider during compile hangs.
				if (prop === 'then' || typeof prop === 'symbol') return undefined;
				if (!members.has(prop)) members.set(prop, jest.fn());
				return members.get(prop);
			},
		},
	);
};

export const createPgliteTestingModule = async (opts: {
	/** The real providers under test (and any mocks you configure/assert on). */
	providers: Provider[];
	/** Entity set for the schema; defaults to the full app entity list. */
	entities?: NonNullable<Options['entities']>;
	/** Modules to import (e.g. EventEmitterModule.forRoot()). */
	imports?: Parameters<typeof Test.createTestingModule>[0]['imports'];
	/** Extra raw SQL run before the schema build (migration-only objects). */
	beforeSchemaSql?: string[];
	/**
	 * Boot DBOS (`DurableWorkflowsModule`) and run the module's init hooks, so `@DurableWorkflow`
	 * methods are real workflows. DBOS needs a real Postgres: its background jobs hold a transaction
	 * on one pool client while querying through another, which the PGlite bridge's one session
	 * cannot serve. It connects to `DBOS_TEST_DATABASE_URL` (a database of its own, created when
	 * missing; the dev Docker Postgres works) under an application name unique to the run; a suite
	 * skips itself when the variable is unset (`describeWithDbos`). Without the option decorated
	 * methods are plain methods and `DurableWorkflowsService` is auto-mocked unless provided.
	 */
	durable?: boolean;
}): Promise<PgliteTestingModule> => {
	const entities = opts.entities ?? ormConfig.entities!;
	const pg = await startPglite();
	if (opts.durable && !DBOS_TEST_DATABASE_URL)
		throw new Error(
			'A suite with `durable: true` needs DBOS_TEST_DATABASE_URL (a Postgres database for DBOS)',
		);

	const moduleRef = await Test.createTestingModule({
		imports: [
			MikroOrmModule.forRoot(
				defineConfig({
					entities,
					subscribers: ormConfig.subscribers,
					...pg.connection,
					pool: { min: 1, max: 1 },
					allowGlobalContext: true,
				}),
			),
			MikroOrmModule.forFeature(entities as Parameters<typeof MikroOrmModule.forFeature>[0]),
			...(opts.durable ?
				[
					DurableWorkflowsModule.forRoot(
						{
							applicationName: `test-${process.pid}-${Date.now()}`,
							applicationVersion: 'test',
							systemDatabaseUrl: DBOS_TEST_DATABASE_URL!,
							poolSize: 4,
							useListenNotify: true,
							disabled: false,
							schedulesEnabled: true,
							tracingEnabled: false,
						},
						{ minimal: true },
					),
				]
			:	[]),
			...(opts.imports ?? []),
		],
		providers: opts.providers,
	})
		.useMocker(autoMock)
		.compile();

	const orm = moduleRef.get(MikroORM);
	await buildSchemaSkippingIndexes(
		orm,
		opts.beforeSchemaSql ?? ['CREATE SEQUENCE IF NOT EXISTS listings_sequence_seq'],
	);
	// The module registers and launches DBOS in `onModuleInit`
	if (opts.durable) await moduleRef.init();

	return {
		moduleRef,
		orm,
		stop: async () => {
			await moduleRef.close();
			await pg.stop();
		},
	};
};
