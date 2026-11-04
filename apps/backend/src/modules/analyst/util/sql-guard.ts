import {
	ANALYST_DENIED_FUNCTIONS,
	ANALYST_DENIED_SCHEMAS,
	ANALYST_DENIED_TABLES,
} from '../constants/analyst.constant.js';

/** Catalog views that hold passwords or the server's setup */
const DENIED_CATALOGS = [
	'pg_authid',
	'pg_shadow',
	'pg_user_mapping',
	'pg_user_mappings',
	'pg_hba_file_rules',
	'pg_ident_file_mappings',
	'pg_file_settings',
	'pg_largeobject',
];

/** Statements that change something; the read-only transaction refuses them anyway, this says why first */
const WRITE_WORDS = [
	'insert',
	'update',
	'delete',
	'merge',
	'truncate',
	'drop',
	'alter',
	'create',
	'grant',
	'revoke',
	'copy',
	'call',
	'do',
	'vacuum',
	'refresh',
	'lock',
	'listen',
	'notify',
	'prepare',
	'execute',
	'deallocate',
	'reset',
	'discard',
	'comment',
	'reindex',
	'cluster',
	'checkpoint',
	'into',
];

const FIRST_WORDS = ['select', 'with', 'values', 'table'];

export type SqlCheck = { ok: true; sql: string } | { ok: false; error: string };

/**
 * The code of a query without its comments and string literals (each literal left as `''`), so a
 * word inside a string ("we drop by often") is never taken for a statement or a table
 */
export const sqlCode = (sql: string): string =>
	sql
		.replace(/--[^\n]*/g, ' ')
		.replace(/\/\*[\s\S]*?\*\//g, ' ')
		.replace(/\$([A-Za-z_]*)\$[\s\S]*?\$\1\$/g, "''")
		// E'…' takes backslash escapes (E'\'' is one quote), a plain literal only ''
		.replace(/\b[Ee]'(?:[^'\\]|\\.|'')*'/g, "''")
		.replace(/'(?:[^']|'')*'/g, "''");

/**
 * Whether the analyst's query may run: one read statement (select, with, values, table), naming no
 * denied table, schema, catalog or function. What it checks is words, so a CTE named `users` is
 * refused too: the model is told to pick another name. The enforcement is the read-only
 * role the query runs as (`AnalystReaderService`: `SELECT` grants only) and the read-only
 * transaction around it; this turns the common refusals into a sentence the model can act on.
 */
export const checkSql = (raw: string): SqlCheck => {
	const sql = raw.trim().replace(/;\s*$/, '').trim();
	if (!sql) return { ok: false, error: 'The query is empty.' };
	const code = sqlCode(sql).toLowerCase();
	if (code.includes(';'))
		return { ok: false, error: 'One statement at a time: no semicolons inside.' };

	const first = code.trim().match(/^\(*\s*([a-z]+)/)?.[1];
	if (!first || !FIRST_WORDS.includes(first))
		return { ok: false, error: 'Only read queries run: start with SELECT or WITH.' };

	// Identifiers, quoted ones unquoted
	const words = new Set(code.replace(/"/g, ' ').match(/[a-z_][a-z0-9_$]*/g) ?? []);
	const write = WRITE_WORDS.find(w => words.has(w));
	if (write)
		return { ok: false, error: `Read queries only: "${write.toUpperCase()}" is not allowed.` };

	const table = [...ANALYST_DENIED_TABLES, ...DENIED_CATALOGS].find(t => words.has(t));
	if (table)
		return {
			ok: false,
			error: `The table "${table}" is not readable here (people's accounts, sessions and caches are out). Leave it out, or rename a CTE that uses the name.`,
		};
	const schema = ANALYST_DENIED_SCHEMAS.find(s => words.has(s));
	if (schema) return { ok: false, error: `The schema "${schema}" is not readable here.` };

	// A function's name may be quoted ("pg_sleep"(1)): read it unquoted
	const unquoted = code.replace(/"/g, '');
	const fn = ANALYST_DENIED_FUNCTIONS.find(f => new RegExp(`\\b${f}\\s*\\(`).test(unquoted));
	if (fn) return { ok: false, error: `The function ${fn}() is not allowed.` };

	return { ok: true, sql };
};
