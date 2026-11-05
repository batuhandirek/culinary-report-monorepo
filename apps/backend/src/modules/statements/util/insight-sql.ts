// Pure: the SQL behind "who talked about X" (`StatementInsightService`): every claim of a scope as
// one row with its source, place, brand, district, channel and side, narrowed by a node (a topic
// and everything under it, or a wording), filters and further nodes, then counted by source.

import { ownPostSql } from 'src/modules/social/util/accounts.js';

import type { StatementKind } from '../constants/kind.constant.js';
import type { StatementSubject } from '../entities/statement.entity.js';

/** A piece of SQL and its bound values, in order */
export interface Sql {
	text: string;
	params: unknown[];
}

export const sql = (text: string, params: unknown[] = []): Sql => ({ text, params });

/** Joins pieces with `sep`, their values in order */
export const joinSql = (parts: Sql[], sep: string): Sql => ({
	text: parts.map(p => p.text).join(sep),
	params: parts.flatMap(p => p.params),
});

const placeholders = (values: unknown[]) => values.map(() => '?').join(', ');

/** The group a claim is shown in, as the pages' `sideOf`: praise, complaints, noted (neutral, mixed, a question), changes, unread */
export const INSIGHT_SIDES = ['praise', 'complaints', 'noted', 'changes', 'unread'] as const;
export type InsightSide = (typeof INSIGHT_SIDES)[number];

/**
 * Where a claim was said, one level finer than its source kind: a Google or TripAdvisor review, a
 * TikTok, Instagram or blog post (and the kinds with no writer yet: comment, press)
 */
export const INSIGHT_CHANNELS = [
	'google_review',
	'tripadvisor_review',
	'tiktok',
	'instagram',
	'blog',
	'comment',
	'press',
] as const;
export type InsightChannel = (typeof INSIGHT_CHANNELS)[number];

/** A source filter: a source kind (`review`, `post`, …) or a channel */
export type InsightSource = 'review' | 'post' | InsightChannel;

/** Whose claims and when: a city, narrowed to a brand, a branch or a district; the months `from`..`to` (YYYY-MM) */
export interface InsightScope {
	cityId: string;
	brandId?: string;
	venueId?: string;
	district?: string;
	/** The brands of one kind of place: their main food (`brandFoodSql`), a topic's key */
	place?: string;
	from: string;
	to: string;
}

/** A node resolved for SQL: a topic as its key and every key under it, or one wording (`Term.key`) */
export type NodeMatch = { topics: string[] } | { term: string };

/** What narrows the claims besides the scope; each optional */
export interface InsightFilters {
	side?: InsightSide;
	/** One kind, or `unread`: agent B has not given one */
	kind?: StatementKind | 'unread';
	source?: InsightSource;
	subject?: StatementSubject;
	/** Every claim must be about each of these too (a breakdown's click: price × döner) */
	with?: NodeMatch[];
}

/**
 * One row per claim of the city in the months, with what every reader of the page needs. Out, as on the theme pages: reviews with no text, claims
 * of a post about a place matched to no brand or made by that brand's own account; and a post's
 * claims about the city or nothing when a brand's own account made it (as aspect discovery
 * leave them out). Brand and place are joined through the source, never stored on the claim.
 */
const claimRowsSql = (cityId: string, months: { from: string; to: string }): Sql =>
	sql(
		`select s.id, s.source_kind, s.subject, s.month, s.said_at, s.sentiment, s.kind, s.amount, s.unit, s.text,
			case when s.review_id is not null then 'review:' || s.review_id
				when s.post_id is not null then 'post:' || s.post_id
				when s.comment_id is not null then 'comment:' || s.comment_id
				else 'press:' || s.web_mention_id end as source,
			case s.source_kind when 'review' then coalesce(r.platform::text, 'google') || '_review'
				when 'post' then p.platform::text
				else s.source_kind end as channel,
			case when s.text is null then null
				when s.kind = 'change' then 'changes'
				when s.kind = 'question' then 'noted'
				when s.sentiment is null then 'unread'
				when s.sentiment = 'positive' then 'praise'
				when s.sentiment = 'negative' then 'complaints'
				else 'noted' end as side,
			coalesce(r.venue_id, m.venue_id, wm.venue_id) as venue_id,
			coalesce(rv.brand_id, m.brand_id, wv.brand_id) as brand_id
		from statements s
		left join reviews r on r.id = s.review_id
		left join venues rv on rv.id = r.venue_id
		left join social_posts p on p.id = s.post_id
		left join mentions m on m.id = s.mention_id
		left join web_mentions wm on wm.id = s.web_mention_id
		left join venues wv on wv.id = wm.venue_id
		where s.city_id = ?
			and s.month >= ? and s.month <= ?
			and (s.source_kind <> 'review' or coalesce(r.text_translated, r.text, '') <> '')
			and (s.source_kind <> 'post' or case when s.mention_id is not null
				then m.brand_id is not null and not ${ownPostSql('p', 'm.brand_id')}
				else not exists (select 1 from social_accounts own_account where own_account.id = p.account_id and own_account.brand_id is not null) end)`,
		[cityId, months.from, months.to],
	);

/**
 * Each brand's kind of place in the city: the main food (`VenueTopic.primary`) of most of its
 * places there, a tie to the one whose places have the most reviews, as the theme pages'
 * `brandFoods` decides it. A brand with no place of a known food has none.
 */
const brandPlaceSql = (cityId: string): Sql =>
	sql(
		`select distinct on (brand_id) brand_id, key, label from (
			select v.brand_id, t.key, t.label, count(*) as places, sum(coalesce(v.reviews_count, 0)) as reviews
			from venues v
			join venue_topics vt on vt.venue_id = v.id and vt.computed and vt."primary"
			join topics t on t.id = vt.topic_id
			where v.city_id = ?
			group by 1, 2, 3
		) x order by brand_id, places desc, reviews desc, key`,
		[cityId],
	);

/**
 * The `claims` CTE: `claimRowsSql` with each claim's district (its place's) and its brand's kind
 * of place (`place_key`, `place_label`), as `c`-aliased rows the outer queries read. Use as
 * `with claims as (…)`.
 */
export const claimsCte = (cityId: string, months: { from: string; to: string }): Sql => {
	const rows = claimRowsSql(cityId, months);
	const places = brandPlaceSql(cityId);
	return sql(
		`select x.*, dv.district, bp.key as place_key, bp.label as place_label from (${rows.text}) x
			left join venues dv on dv.id = x.venue_id
			left join (${places.text}) bp on bp.brand_id = x.brand_id`,
		[...rows.params, ...places.params],
	);
};

/** The claim (`c.id`) is about one of these topics, through its aspect part or a food wording's links */
export const aboutTopicsSql = (keys: string[], c = 'c'): Sql => {
	if (!keys.length) return sql('false');
	const list = placeholders(keys);
	return sql(
		`(exists (select 1 from statement_parts xp join topics xt on xt.id = xp.topic_id
				where xp.statement_id = ${c}.id and xp.role = 'aspect' and xt.deleted_at is null and xt.key in (${list}))
			or exists (select 1 from statement_parts xp join term_topics xtt on xtt.term_id = xp.term_id join topics xt on xt.id = xtt.topic_id
				where xp.statement_id = ${c}.id and xp.role = 'food' and xt.deleted_at is null and xt.key in (${list})))`,
		[...keys, ...keys],
	);
};

/** The claim (`c.id`) names this wording */
export const namesTermSql = (key: string, c = 'c'): Sql =>
	sql(
		`exists (select 1 from statement_parts xp join terms xm on xm.id = xp.term_id
			where xp.statement_id = ${c}.id and xp.role = 'food' and xm.key = ?)`,
		[key],
	);

export const nodeSql = (node: NodeMatch, c = 'c'): Sql =>
	'term' in node ? namesTermSql(node.term, c) : aboutTopicsSql(node.topics, c);

/** The scope's brand, branch and district on `c` */
export const scopeSql = (
	scope: Pick<InsightScope, 'brandId' | 'venueId' | 'district' | 'place'>,
	c = 'c',
): Sql[] => [
	...(scope.brandId ? [sql(`${c}.brand_id = ?`, [scope.brandId])] : []),
	...(scope.venueId ? [sql(`${c}.venue_id = ?`, [scope.venueId])] : []),
	...(scope.district ? [sql(`${c}.district = ?`, [scope.district])] : []),
	...(scope.place ? [sql(`${c}.place_key = ?`, [scope.place])] : []),
];

/** Who the base is: the source and subject filters narrow the population a share is of; the rest narrow what is counted in it */
export const populationSql = (
	filters: Pick<InsightFilters, 'source' | 'subject'>,
	c = 'c',
): Sql[] => [
	...(filters.source ?
		[sql(`(${c}.source_kind = ? or ${c}.channel = ?)`, [filters.source, filters.source])]
	:	[]),
	...(filters.subject ? [sql(`${c}.subject = ?`, [filters.subject])] : []),
];

/** The filters that narrow what is counted: side, kind and the further nodes */
export const narrowingSql = (
	filters: Omit<InsightFilters, 'source' | 'subject'>,
	c = 'c',
): Sql[] => [
	...(filters.side ? [sql(`${c}.side = ?`, [filters.side])] : []),
	...(filters.kind === 'unread' ? [sql(`${c}.kind is null`)]
	: filters.kind ? [sql(`${c}.kind = ?`, [filters.kind])]
	: []),
	...(filters.with ?? []).map(node => nodeSql(node, c)),
];

/**
 * The claims a share is of, per the theme pages' bases: for praise or complaints the sources with
 * a praise or complaint; for changes, with any of the three; otherwise with any claim
 */
export const baseSideSql = (side: InsightSide | undefined, c = 'c'): Sql =>
	side === 'praise' || side === 'complaints' ? sql(`${c}.side in ('praise', 'complaints')`)
	: side === 'changes' ? sql(`${c}.side in ('praise', 'complaints', 'changes')`)
	: sql(`${c}.text is not null`);

/** `where …` of the pieces, `where true` for none */
export const whereSql = (parts: Sql[]): Sql =>
	parts.length ? joinSql([sql('where'), joinSql(parts, ' and ')], ' ') : sql('where true');

/** The topics with every ancestor of each, as (id, ancestor id) pairs, a topic its own ancestor. Use as `with recursive anc(id, anc_id) as (…)` */
export const ANCESTORS_SQL = `select id, id from topics where deleted_at is null
	union all
	select anc.id, t.parent_id from anc join topics t on t.id = anc.anc_id where t.parent_id is not null`;

/** Every topic a claim is about directly: its aspect, and its food wordings' links (any kind, an aspect too: "waiting time" → Waiting) */
export const CLAIM_TOPICS_SQL = `select ap.statement_id, ap.topic_id from statement_parts ap where ap.role = 'aspect'
	union
	select fp.statement_id, tt.topic_id from statement_parts fp join term_topics tt on tt.term_id = fp.term_id where fp.role = 'food'`;

/** The counts every breakdown row and tree node carries, over claims `c` */
export const COUNT_FIELDS = (c = 'c') => `count(distinct ${c}.source)::int as sources,
	count(distinct ${c}.source) filter (where ${c}.side = 'praise')::int as praise,
	count(distinct ${c}.source) filter (where ${c}.side = 'complaints')::int as complaints`;
