import { EntityManager } from '@mikro-orm/postgresql';

import { Injectable } from '@nestjs/common';

import type { AnalystMention } from 'sdk';

import {
	ANALYST_DENIED_TABLES,
	ANALYST_FETCH_ROWS,
	ANALYST_STATEMENT_TIMEOUT_MS,
	ANALYST_STORED_CELL_CHARS,
	ANALYST_STORED_ROWS,
} from '../constants/analyst.constant.js';
import type { MentionRef } from '../util/mentions.js';
import { type Cell, tableOfArrays } from '../util/rows.js';
import { checkSql } from '../util/sql-guard.js';

import { AnalystReaderService } from './analyst-reader.service.js';

export type SqlResult =
	| {
			ok: true;
			columns: string[];
			rows: Cell[][];
			/** Rows returned, up to the fetch cap */
			rowCount: number;
			truncated: boolean;
			durationMs: number;
	  }
	| { ok: false; error: string; durationMs: number };

export interface FoundEntity {
	type: AnalystMention['type'];
	id: string;
	/** What a mention token carries: a topic's key, else the id */
	ref: string;
	label: string;
	detail?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SEARCH_LIMIT = 8;

/**
 * The analyst's window on the database: the model's queries, run read-only, one statement, with a
 * time limit and a row cap (`run`); the schema it asks about (`schema`); and the rows an admin's
 * `@` mentions and the page's picker name (`resolve`, `search`). Raw SQL over other modules' tables,
 * reading only, as the overview module does: the analyst is a read model across every module.
 */
@Injectable()
export class AnalystSqlService {
	constructor(
		private readonly em: EntityManager,
		private readonly reader: AnalystReaderService,
	) {}

	/**
	 * Runs one read query as the reader role (`AnalystReaderService`: `SELECT` grants only), in its
	 * own read-only transaction with a time limit, through a cursor so Postgres stops at the fetch
	 * cap. The text goes to Postgres as written (no placeholders, so jsonb's `?` works), over the
	 * extended protocol, which takes one statement only.
	 */
	async run(query: string): Promise<SqlResult> {
		const start = Date.now();
		const check = checkSql(query);
		if (!check.ok) return { ok: false, error: check.error, durationMs: 0 };
		try {
			const res = await this.reader.read(
				[
					`set local statement_timeout = ${ANALYST_STATEMENT_TIMEOUT_MS}`,
					`declare analyst_cursor no scroll cursor for ${check.sql}`,
				],
				`fetch forward ${ANALYST_FETCH_ROWS} from analyst_cursor`,
			);
			const truncated = res.rows.length > ANALYST_STORED_ROWS;
			const kept = truncated ? res.rows.slice(0, ANALYST_STORED_ROWS) : res.rows;
			const { columns, rows } = tableOfArrays(
				res.columns,
				res.types,
				kept,
				ANALYST_STORED_CELL_CHARS,
			);
			return {
				ok: true,
				columns,
				rows,
				rowCount: kept.length,
				truncated,
				durationMs: Date.now() - start,
			};
		} catch (e) {
			return { ok: false, error: postgresError(e), durationMs: Date.now() - start };
		}
	}

	/**
	 * The tables the analyst may read, each with its estimated rows; with `tables`, their columns
	 * (type, nullable), what their foreign keys point at and the check lists of enum columns
	 */
	async schema(tables?: string[]): Promise<string> {
		const denied = new Set<string>(ANALYST_DENIED_TABLES);
		if (!tables?.length) {
			const rows = await this.em.execute<{ name: string; estimate: number }[]>(
				`select c.relname as name, greatest(c.reltuples, 0)::bigint::int as estimate
				 from pg_class c join pg_namespace n on n.oid = c.relnamespace
				 where n.nspname = 'public' and c.relkind = 'r' order by c.relname`,
			);
			return rows
				.filter(r => !denied.has(r.name))
				.map(r => `${r.name} (~${r.estimate} rows)`)
				.join('\n');
		}
		const wanted = tables.map(t => t.trim().toLowerCase()).filter(t => t && !denied.has(t));
		if (!wanted.length) return 'None of those tables is readable here.';
		const placeholders = wanted.map(() => '?').join(', ');
		const columns = await this.em.execute<
			{ table: string; column: string; type: string; nullable: string; enum: string | null }[]
		>(
			`select c.table_name as table, c.column_name as column,
			        case when c.data_type = 'USER-DEFINED' then c.udt_name else c.data_type end as type,
			        c.is_nullable as nullable,
			        (select string_agg(e.enumlabel, ' | ' order by e.enumsortorder)
			         from pg_type t join pg_enum e on e.enumtypid = t.oid where t.typname = c.udt_name) as enum
			 from information_schema.columns c
			 where c.table_schema = 'public' and c.table_name in (${placeholders})
			 order by c.table_name, c.ordinal_position`,
			wanted,
		);
		const keys = await this.em.execute<{ table: string; column: string; target: string }[]>(
			`select tc.table_name as table, kcu.column_name as column,
			        ccu.table_name || '.' || ccu.column_name as target
			 from information_schema.table_constraints tc
			 join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name
			 join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name
			 where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'
			   and tc.table_name in (${placeholders})`,
			wanted,
		);
		const out: string[] = [];
		for (const table of wanted) {
			const cols = columns.filter(c => c.table === table);
			if (!cols.length) {
				out.push(`${table}: no such table`);
				continue;
			}
			out.push(
				`${table}:\n${cols
					.map(c => {
						const fk = keys.find(k => k.table === table && k.column === c.column);
						return `  ${c.column} ${c.type}${c.nullable === 'YES' ? ' null' : ''}${fk ? ` → ${fk.target}` : ''}${c.enum ? ` (${c.enum})` : ''}`;
					})
					.join('\n')}`,
			);
		}
		return out.join('\n');
	}

	/** Rows by name for the page's `@` picker and the `find` tool, best matches first */
	async search(
		type: AnalystMention['type'] | undefined,
		q: string,
		cityId?: string,
	): Promise<FoundEntity[]> {
		const text = q.trim();
		if (!text) return [];
		const like = `%${text.replace(/[%_\\]/g, m => `\\${m}`)}%`;
		const types =
			type ? [type] : (['brand', 'venue', 'aspect', 'topic', 'creator', 'city'] as const);
		const results = await Promise.all(types.map(t => this.searchOne(t, like, text, cityId)));
		return results.flat();
	}

	private async searchOne(
		type: AnalystMention['type'],
		like: string,
		text: string,
		cityId?: string,
	): Promise<FoundEntity[]> {
		const city = cityId && UUID.test(cityId) ? cityId : null;
		switch (type) {
			case 'venue': {
				const rows = await this.em.execute<{ id: string; name: string; detail: string }[]>(
					`select v.id, v.name, concat_ws(' · ', v.street, v.district, c.name, case when v.closed then 'closed' end) as detail
					 from venues v join cities c on c.id = v.city_id
					 where v.name ilike ? ${city ? 'and v.city_id = ?' : ''}
					 order by (lower(v.name) = lower(?)) desc, v.reviews_count desc nulls last limit ${SEARCH_LIMIT}`,
					city ? [like, city, text] : [like, text],
				);
				return rows.map(r => ({
					type,
					id: r.id,
					ref: r.id,
					label: r.name,
					detail: r.detail,
				}));
			}
			case 'brand': {
				const rows = await this.em.execute<
					{ id: string; name: string; branches: number }[]
				>(
					`select b.id, b.name, count(v.id)::int as branches
					 from brands b left join venues v on v.brand_id = b.id and not coalesce(v.closed, false)
					   ${city ? 'and v.city_id = ?' : ''}
					 where b.name ilike ?
					 group by b.id order by (lower(b.name) = lower(?)) desc, count(v.id) desc, b.lead_score desc nulls last
					 limit ${SEARCH_LIMIT}`,
					city ? [city, like, text] : [like, text],
				);
				return rows.map(r => ({
					type,
					id: r.id,
					ref: r.id,
					label: r.name,
					detail: `${r.branches} open branch${r.branches === 1 ? '' : 'es'}`,
				}));
			}
			case 'aspect':
			case 'topic': {
				const rows = await this.em.execute<
					{
						id: string;
						key: string;
						label: string;
						kind: string;
						parent: string | null;
					}[]
				>(
					`select t.id, t.key, t.label, t.kind::text as kind, p.label as parent
					 from topics t left join topics p on p.id = t.parent_id
					 where t.deleted_at is null and t.kind ${type === 'aspect' ? '=' : '<>'} 'aspect'
					   and (t.label ilike ? or t.key ilike ?)
					 order by (lower(t.label) = lower(?)) desc, length(t.label) limit ${SEARCH_LIMIT}`,
					[like, like, text],
				);
				return rows.map(r => ({
					type,
					id: r.id,
					ref: r.key,
					label: r.label,
					detail: [r.kind, r.parent && `under ${r.parent}`].filter(Boolean).join(' · '),
				}));
			}
			case 'term': {
				const rows = await this.em.execute<{ id: number; key: string; name: string }[]>(
					`select id, key, name from terms where name ilike ? order by (lower(name) = lower(?)) desc, length(name) limit ${SEARCH_LIMIT}`,
					[like, text],
				);
				return rows.map(r => ({
					type,
					id: String(r.id),
					ref: r.key,
					label: r.name,
					detail: 'wording',
				}));
			}
			case 'creator': {
				const rows = await this.em.execute<{ id: string; name: string; handles: string }[]>(
					`select cr.id, cr.name, string_agg(a.platform::text || ' @' || a.handle, ', ') as handles
					 from creators cr join social_accounts a on a.creator_id = cr.id
					 where cr.name ilike ? or a.handle ilike ?
					 group by cr.id order by max(a.followers) desc nulls last limit ${SEARCH_LIMIT}`,
					[like, like],
				);
				return rows.map(r => ({
					type,
					id: r.id,
					ref: r.id,
					label: r.name,
					detail: r.handles,
				}));
			}
			case 'city': {
				const rows = await this.em.execute<{ id: string; name: string; slug: string }[]>(
					`select id, name, slug from cities where name ilike ? or slug ilike ? limit ${SEARCH_LIMIT}`,
					[like, like],
				);
				return rows.map(r => ({ type, id: r.id, ref: r.slug, label: r.name }));
			}
			case 'post':
				return [];
		}
	}

	/** Each `@` mention as the row it names, with a line of facts the model is given */
	async resolve(refs: MentionRef[]): Promise<AnalystMention[]> {
		return Promise.all(refs.map(ref => this.resolveOne(ref)));
	}

	private async resolveOne({ type, ref }: MentionRef): Promise<AnalystMention> {
		const missing: AnalystMention = { type, ref, found: false };
		const isId = UUID.test(ref);
		switch (type) {
			case 'venue': {
				if (!isId) return missing;
				const [row] = await this.em.execute<Record<string, string | number | null>[]>(
					`select v.id, v.name, v.street, v.district, v.category, v.rating, v.reviews_count, v.closed,
					        c.name as city, b.id as brand_id, b.name as brand
					 from venues v join cities c on c.id = v.city_id join brands b on b.id = v.brand_id where v.id = ?`,
					[ref],
				);
				if (!row) return missing;
				return {
					type,
					ref,
					id: String(row.id),
					label: String(row.name),
					found: true,
					facts: `venues.id = '${row.id}': ${row.name}, ${[row.street, row.district, row.city].filter(Boolean).join(', ')}; ${row.category ?? 'no category'}; Google ${row.rating ?? '—'} from ${row.reviews_count ?? 0} reviews${row.closed ? '; closed' : ''}; a branch of the brand "${row.brand}" (brands.id = '${row.brand_id}')`,
				};
			}
			case 'brand': {
				if (!isId) return missing;
				const [row] = await this.em.execute<
					{ id: string; name: string; branches: number; cities: string | null }[]
				>(
					`select b.id, b.name, count(v.id) filter (where not coalesce(v.closed, false))::int as branches,
					        string_agg(distinct c.name, ', ') as cities
					 from brands b left join venues v on v.brand_id = b.id left join cities c on c.id = v.city_id
					 where b.id = ? group by b.id`,
					[ref],
				);
				if (!row) return missing;
				return {
					type,
					ref,
					id: row.id,
					label: row.name,
					found: true,
					facts: `brands.id = '${row.id}': ${row.name}, ${row.branches} open branch${row.branches === 1 ? '' : 'es'} (venues.brand_id) in ${row.cities ?? 'no city'}`,
				};
			}
			case 'aspect':
			case 'topic': {
				const [row] = await this.em.execute<
					{
						id: string;
						key: string;
						label: string;
						kind: string;
						parent: string | null;
						hint: string | null;
					}[]
				>(
					`select t.id, t.key, t.label, t.kind::text as kind, p.key as parent, t.hint
					 from topics t left join topics p on p.id = t.parent_id
					 where t.deleted_at is null and ${isId ? 't.id = ?' : 't.key = ?'}`,
					[ref],
				);
				if (!row) return missing;
				return {
					type: row.kind === 'aspect' ? 'aspect' : 'topic',
					ref,
					id: row.id,
					label: row.label,
					found: true,
					facts: `topics.id = '${row.id}', key '${row.key}': "${row.label}", kind ${row.kind}${row.parent ? `, under '${row.parent}'` : ', a root'}${row.hint ? `; hint: ${row.hint}` : ''}`,
				};
			}
			case 'term': {
				const [row] = await this.em.execute<
					{ id: number; key: string; name: string; topics: string | null }[]
				>(
					`select t.id, t.key, t.name, string_agg(tp.key || ' (' || tt.relation || ')', ', ' order by tt.rank) as topics
					 from terms t left join term_topics tt on tt.term_id = t.id left join topics tp on tp.id = tt.topic_id
					 where ${/^\d+$/.test(ref) ? 't.id = ?' : 't.key = ?'} group by t.id`,
					[/^\d+$/.test(ref) ? Number(ref) : ref],
				);
				if (!row) return missing;
				return {
					type,
					ref,
					id: String(row.id),
					label: row.name,
					found: true,
					facts: `terms.id = ${row.id}, key '${row.key}': the wording "${row.name}", linked to ${row.topics ?? 'no topic'}`,
				};
			}
			case 'city': {
				const [row] = await this.em.execute<{ id: string; name: string; slug: string }[]>(
					`select id, name, slug from cities where ${isId ? 'id = ?' : 'slug = ?'}`,
					[ref],
				);
				if (!row) return missing;
				return {
					type,
					ref,
					id: row.id,
					label: row.name,
					found: true,
					facts: `cities.id = '${row.id}': ${row.name} (slug ${row.slug})`,
				};
			}
			case 'creator': {
				if (!isId) return missing;
				const [row] = await this.em.execute<
					{ id: string; name: string; handles: string | null }[]
				>(
					`select cr.id, cr.name, string_agg(a.platform::text || ' @' || a.handle || coalesce(' (' || a.followers || ' followers)', ''), ', ') as handles
					 from creators cr left join social_accounts a on a.creator_id = cr.id where cr.id = ? group by cr.id`,
					[ref],
				);
				if (!row) return missing;
				return {
					type,
					ref,
					id: row.id,
					label: row.name,
					found: true,
					facts: `creators.id = '${row.id}': ${row.name}; accounts (social_accounts.creator_id): ${row.handles ?? 'none'}`,
				};
			}
			case 'post': {
				if (!isId) return missing;
				const [row] = await this.em.execute<
					{
						id: string;
						platform: string;
						author: string;
						posted_at: Date;
						views: number | null;
					}[]
				>(
					`select id, platform::text as platform, author, posted_at, views from social_posts where id = ?`,
					[ref],
				);
				if (!row) return missing;
				return {
					type,
					ref,
					id: row.id,
					label: `${row.platform} post by @${row.author}`,
					found: true,
					facts: `social_posts.id = '${row.id}': ${row.platform} by @${row.author}, posted ${new Date(row.posted_at).toISOString().slice(0, 10)}, ${row.views ?? '—'} views`,
				};
			}
		}
	}
}

/** Postgres's message, with its hint and where it pointed, for the model to fix the query */
const postgresError = (e: unknown): string => {
	const err = e as {
		message?: string;
		hint?: string;
		detail?: string;
		position?: string;
		code?: string;
	};
	if (err.code === '57014')
		return 'The query took too long and was cancelled: narrow it (a month, a city, an index-friendly filter) or aggregate first.';
	return [
		err.message ?? String(e),
		err.detail && `Detail: ${err.detail}`,
		err.hint && `Hint: ${err.hint}`,
		err.position && `At character ${err.position}.`,
	]
		.filter(Boolean)
		.join(' ');
};
