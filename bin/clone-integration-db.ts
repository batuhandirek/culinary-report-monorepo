#!/usr/bin/env bun
// Clones the dev database into a disposable integration database
// (CREATE DATABASE ... TEMPLATE ... — fast file-level copy, no backup restore).
// Run via: bun --env-file=env/server/.env.local bin/clone-integration-db.ts
import pg from 'pg';

const { DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_SSL } = process.env;
if (!DB_HOST || !DB_PORT || !DB_USERNAME) {
	console.error('Missing DB_HOST / DB_PORT / DB_USERNAME in env');
	process.exit(1);
}

const SOURCE_DB = process.env.DB_NAME ?? 'culinary_report';
const INTEGRATION_DB = process.env.INTEGRATION_DB_NAME ?? `${SOURCE_DB}_integration`;

const connectionBase = {
	host: DB_HOST,
	port: Number(DB_PORT),
	user: DB_USERNAME,
	password: DB_PASSWORD,
	ssl: DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

const admin = new pg.Client({ ...connectionBase, database: 'postgres' });
await admin.connect();

try {
	console.log(`Dropping ${INTEGRATION_DB} (if it exists)`);
	await admin.query(
		`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
		[INTEGRATION_DB],
	);
	await admin.query(`DROP DATABASE IF EXISTS ${INTEGRATION_DB}`);

	// The template database must have no connections during the copy; the dev
	// server's pool reconnects on its next query (same disruption as bin/reset.sh).
	console.log(`Cloning ${SOURCE_DB} -> ${INTEGRATION_DB}`);
	await admin.query(
		`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
		[SOURCE_DB],
	);
	await admin.query(`CREATE DATABASE ${INTEGRATION_DB} TEMPLATE ${SOURCE_DB}`);
} finally {
	await admin.end();
}

// Clear queued pg-boss jobs cloned from the snapshot — otherwise the test server
// replays them (LLM calls, notifications for real data).
const clone = new pg.Client({ ...connectionBase, database: INTEGRATION_DB });
await clone.connect();
try {
	const { rows } = await clone.query<{ tablename: string }>(
		`SELECT tablename FROM pg_tables WHERE schemaname = 'pgboss' AND tablename IN ('job', 'archive')`,
	);
	for (const { tablename } of rows) {
		console.log(`Truncating pgboss.${tablename}`);
		await clone.query(`TRUNCATE TABLE pgboss.${tablename}`);
	}
} finally {
	await clone.end();
}

console.log(`Done: ${INTEGRATION_DB} is ready`);
