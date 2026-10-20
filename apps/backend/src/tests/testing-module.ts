import { MikroOrmModule } from '@mikro-orm/nestjs';
import { defineConfig, MikroORM, Options } from '@mikro-orm/postgresql';

import { Provider } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { jest } from '@jest/globals';

import ormConfig from 'src/mikro-orm.config.js';

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
}): Promise<PgliteTestingModule> => {
	const entities = opts.entities ?? ormConfig.entities!;
	const pg = await startPglite();

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

	return {
		moduleRef,
		orm,
		stop: async () => {
			await moduleRef.close();
			await pg.stop();
		},
	};
};
