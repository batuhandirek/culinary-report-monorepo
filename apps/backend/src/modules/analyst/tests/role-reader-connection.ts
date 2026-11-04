import type { EntityManager } from '@mikro-orm/postgresql';

import { sql } from 'kysely';

import { ANALYST_READER_ROLE } from '../constants/analyst.constant.js';
import type { AnalystReaderConnection, ReaderResult } from '../services/analyst-reader.service.js';

/**
 * The reader over the PGlite harness's one connection: the same transaction the pool opens, as
 * the reader role through `set local role` (PGlite has one login user), so the grants are what is
 * tested. Production logs in as the role instead, which nothing inside a session can undo.
 */
export const roleReaderConnection = (em: EntityManager): AnalystReaderConnection => ({
	read: (setup, query) =>
		em
			.getKysely()
			.transaction()
			.execute(async trx => {
				await sql.raw('set transaction read only').execute(trx);
				await sql.raw(`set local role ${ANALYST_READER_ROLE}`).execute(trx);
				for (const statement of setup) await sql.raw(statement).execute(trx);
				const res = await sql.raw<Record<string, unknown>>(query).execute(trx);
				const columns = res.rows.length ? Object.keys(res.rows[0]) : [];
				return {
					columns,
					types: columns.map(() => 0),
					rows: res.rows.map(r => columns.map(c => r[c])),
				} satisfies ReaderResult;
			}),
	close: async () => undefined,
});
