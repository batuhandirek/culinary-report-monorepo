import { defineConfig, MikroORM, Options } from '@mikro-orm/postgresql';

import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { createServer } from 'node:net';

/**
 * In-process Postgres for tests — no external database. PGlite is a WASM Postgres; MikroORM's
 * `pg` driver speaks the wire protocol, so {@link PGLiteSocketServer} bridges them on a
 * localhost TCP port. The `vector` extension is loaded + created so pgvector entities work.
 *
 * PGlite is single-connection — pin the pool to 1 and run pglite suites with `--runInBand`.
 */

/** Ask the OS for a free TCP port (bind :0, read the assigned port, release it). */
const freePort = (): Promise<number> =>
	new Promise((resolve, reject) => {
		const srv = createServer();
		srv.once('error', reject);
		srv.listen(0, '127.0.0.1', () => {
			const { port } = srv.address() as { port: number };
			srv.close(() => resolve(port));
		});
	});

export interface Pglite {
	db: PGlite;
	/** localhost TCP port MikroORM connects to. */
	port: number;
	/** Connection options to spread into a MikroORM config. */
	connection: { host: string; port: number; user: string; password: string; dbName: string };
	stop: () => Promise<void>;
}

/** Boot PGlite + the wire-protocol socket server (extension created). No MikroORM yet. */
export const startPglite = async (): Promise<Pglite> => {
	const db = await PGlite.create({ extensions: { vector } });
	// Loading the extension only makes it available; create it so pgvector types exist.
	await db.exec('CREATE EXTENSION IF NOT EXISTS vector;');
	const port = await freePort();
	const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1' });
	await server.start();
	return {
		db,
		port,
		connection: { host: '127.0.0.1', port, user: 'postgres', password: '', dbName: 'postgres' },
		stop: async () => {
			await server.stop();
			await db.close();
		},
	};
};

/**
 * Build the full app schema on an already-connected ORM: tables + FKs from
 * `getCreateSchemaSQL()`, skipping `CREATE INDEX` (the app's hand-named fulltext+btree
 * indexes collide under schema-gen and don't affect test correctness). Runs `beforeSchemaSql`
 * first for migration-only objects (e.g. custom sequences).
 */
export const buildSchemaSkippingIndexes = async (
	orm: MikroORM,
	beforeSchemaSql: string[] = [],
): Promise<void> => {
	const conn = orm.em.getConnection();
	for (const statement of beforeSchemaSql) await conn.execute(statement);
	const sql = await orm.schema.getCreateSchemaSQL();
	for (const statement of sql.split(';')) {
		const trimmed = statement.trim();
		if (!trimmed || /^create\s+(unique\s+)?index/i.test(trimmed)) continue;
		await conn.execute(trimmed);
	}
};

export interface PgliteOrm {
	orm: MikroORM;
	/** Close the ORM, stop the socket server and dispose the embedded db. */
	stop: () => Promise<void>;
}

/**
 * Standalone pglite MikroORM (no NestJS) — handy for engine-level tests with synthetic
 * entities. Builds schema via `schema.refresh()` unless `skipIndexes` is set.
 */
export const createPgliteOrm = async (
	entities: NonNullable<Options['entities']>,
	opts: { skipIndexes?: boolean; beforeSchemaSql?: string[] } = {},
): Promise<PgliteOrm> => {
	const pg = await startPglite();
	const orm = await MikroORM.init(
		defineConfig({
			entities,
			...pg.connection,
			pool: { min: 1, max: 1 },
			allowGlobalContext: true,
		}),
	);
	if (opts.skipIndexes) {
		await buildSchemaSkippingIndexes(orm, opts.beforeSchemaSql);
	} else {
		await orm.schema.refresh();
	}
	return {
		orm,
		stop: async () => {
			await orm.close(true);
			await pg.stop();
		},
	};
};
