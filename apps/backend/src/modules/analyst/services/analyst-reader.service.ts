import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { randomBytes } from 'node:crypto';
import pg from 'pg';

import { mainConfig } from 'src/config/main.config.js';

import {
	ANALYST_DENIED_TABLES,
	ANALYST_READER_ROLE,
	ANALYST_STATEMENT_TIMEOUT_MS,
} from '../constants/analyst.constant.js';

/** A query's result as Postgres gave it: column names and type oids in order, rows as arrays */
export interface ReaderResult {
	columns: string[];
	types: number[];
	rows: unknown[][];
}

/**
 * Where the analyst's queries run. `read` opens one transaction, read-only, as the reader role,
 * runs the setup statements (the time limit, the cursor) and then the query, and ends it.
 */
export interface AnalystReaderConnection {
	read(setup: string[], query: string): Promise<ReaderResult>;
	close(): Promise<void>;
}

/**
 * One statement over the extended protocol, rows as arrays: Postgres refuses a second statement
 * in it ("cannot insert multiple commands into a prepared statement"). `queryMode` is pg's
 * (8.12+), not yet in its types.
 */
const extended = (text: string): pg.QueryArrayConfig =>
	({ text, queryMode: 'extended', rowMode: 'array' }) as pg.QueryArrayConfig;

/**
 * The reader's own pool, logged in as `ANALYST_READER_ROLE`: nothing the model writes ever runs
 * as the app's user. Every statement goes through the extended protocol, so Postgres refuses a
 * second statement inside one; the session is reset after each use.
 */
class PoolReaderConnection implements AnalystReaderConnection {
	private readonly pool: pg.Pool;

	constructor(password: string) {
		this.pool = new pg.Pool({
			host: mainConfig.DB_HOST,
			port: mainConfig.DB_PORT,
			database: mainConfig.DB_NAME,
			user: ANALYST_READER_ROLE,
			password,
			ssl: mainConfig.DB_SSL ? { rejectUnauthorized: false } : false,
			max: 3,
			idleTimeoutMillis: 30_000,
			application_name: 'munchwerk-analyst',
		});
		// An idle client's error (the server restarted) must not crash the process
		this.pool.on('error', () => undefined);
	}

	async read(setup: string[], query: string): Promise<ReaderResult> {
		const client = await this.pool.connect();
		let broken = false;
		try {
			await client.query('begin read only');
			for (const statement of setup) await client.query(extended(statement));
			const res = await client.query(extended(query));
			await client.query('commit');
			return {
				columns: res.fields.map(f => f.name),
				types: res.fields.map(f => f.dataTypeID),
				rows: res.rows as unknown[][],
			};
		} catch (e) {
			await client.query('rollback').catch(() => (broken = true));
			throw e;
		} finally {
			// Whatever the session set (a setting, a prepared statement) goes with it
			if (!broken) await client.query('discard all').catch(() => (broken = true));
			client.release(broken);
		}
	}

	close() {
		return this.pool.end();
	}
}

/**
 * The analyst's database role and connection: the guarantee that a query the model writes can
 * read and nothing else, whatever it says. At boot, as the app's user, it (re)creates the role
 * (`readerRoleSql`): no superuser, no role membership, read-only by default, a time limit, and
 * `SELECT` on every table but `ANALYST_DENIED_TABLES`, nothing else; its password is new at every
 * boot and never stored. When the role can't be set up (the app's user may not create roles),
 * the analyst runs no query at all.
 */
@Injectable()
export class AnalystReaderService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(AnalystReaderService.name);
	private connection: AnalystReaderConnection | null = null;
	private failure: string | null = 'Not set up yet';

	constructor(private readonly em: EntityManager) {}

	async onModuleInit() {
		const password = randomBytes(24).toString('base64url');
		try {
			await this.ensureRole(password);
			this.connection = new PoolReaderConnection(password);
			this.failure = null;
		} catch (e) {
			this.failure = (e as Error).message;
			this.logger.error(
				`The analyst's reader role could not be set up, so it runs no query: ${this.failure}`,
			);
		}
	}

	async onModuleDestroy() {
		await this.connection?.close();
	}

	/** The role, its settings and its grants, as the app's user; safe to run again */
	async ensureRole(password: string | null) {
		const em = this.em.fork();
		const tables = await em.execute<{ name: string }[]>(
			`select tablename as name from pg_tables where schemaname = 'public'`,
		);
		for (const statement of readerRoleSql(
			password,
			tables.map(t => t.name),
		))
			await em.execute(statement);
	}

	/** Tests run the reader over the harness's own connection (`tests/`): PGlite has one user */
	async useConnection(connection: AnalystReaderConnection) {
		await this.connection?.close();
		this.connection = connection;
		this.failure = null;
	}

	read(setup: string[], query: string): Promise<ReaderResult> {
		if (!this.connection)
			return Promise.reject(
				new Error(`The analyst's database role is not set up: ${this.failure}`),
			);
		return this.connection.read(setup, query);
	}
}

const literal = (value: string) => `'${value.replace(/'/g, "''")}'`;
const ident = (name: string) => `"${name.replace(/"/g, '""')}"`;

/**
 * The reader role from scratch: whatever it was granted before is taken back first, so the
 * grants are exactly these after every boot (a table added since is granted, a denied one never).
 */
export const readerRoleSql = (password: string | null, tables: string[]): string[] => {
	const role = ident(ANALYST_READER_ROLE);
	const denied = new Set<string>(ANALYST_DENIED_TABLES);
	const readable = tables.filter(t => !denied.has(t));
	return [
		`do $$ begin
			if not exists (select 1 from pg_roles where rolname = ${literal(ANALYST_READER_ROLE)}) then
				create role ${role};
			end if;
		end $$`,
		`alter role ${role} nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls ${password ? `login password ${literal(password)}` : 'nologin'} connection limit 5`,
		`alter role ${role} set default_transaction_read_only = on`,
		`alter role ${role} set statement_timeout = ${ANALYST_STATEMENT_TIMEOUT_MS}`,
		`alter role ${role} set idle_in_transaction_session_timeout = 60000`,
		`revoke all on all tables in schema public from ${role}`,
		`revoke all on all sequences in schema public from ${role}`,
		`revoke all on schema public from ${role}`,
		`grant usage on schema public to ${role}`,
		...(readable.length ?
			[`grant select on ${readable.map(t => `public.${ident(t)}`).join(', ')} to ${role}`]
		:	[]),
	];
};
