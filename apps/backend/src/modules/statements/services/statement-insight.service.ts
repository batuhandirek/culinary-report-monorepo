import { EntityManager } from '@mikro-orm/postgresql';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import _ from 'lodash';

import { TopicService } from 'src/modules/topics/services/topic.service.js';
import type { TopicIndex } from 'src/modules/topics/util/topics.js';
import { previousMonth } from 'src/modules/venues/util/month.js';
import { toVectorLiteral } from 'src/shared/util/vector.js';

import {
	CLUSTER_DIMENSIONS,
	CLUSTER_MAX_CLAIMS,
	CLUSTER_SAMPLE_THRESHOLD,
	STATEMENT_EMBEDDING_DIMENSIONS,
} from '../constants/embeddings.constant.js';
import type { StatementKind } from '../constants/kind.constant.js';
import type { Sentiment } from '../constants/sentiment.constant.js';
import {
	Statement,
	type StatementSubject,
	type StatementUnit,
} from '../entities/statement.entity.js';
import { clusterClaims, type ClusterItem, diverseSamples } from '../util/cluster.js';
import {
	foldParent,
	INSIGHT_BREAKDOWN_ROWS,
	INSIGHT_DEFAULT_MONTHS,
	INSIGHT_MAX_MONTHS,
	isTermRef,
	monthsBetween,
	percent,
	pointsChange,
	shiftMonth,
	statedAmounts,
	TERM_REF,
	termRef,
} from '../util/insight.js';
import {
	ANCESTORS_SQL,
	baseSideSql,
	CLAIM_TOPICS_SQL,
	claimsCte,
	COUNT_FIELDS,
	type InsightFilters,
	type InsightScope,
	type InsightSide,
	type InsightSource,
	joinSql,
	narrowingSql,
	type NodeMatch,
	nodeSql,
	populationSql,
	scopeSql,
	type Sql,
	sql,
	whereSql,
} from '../util/insight-sql.js';
import { STATEMENT_PARTS_POPULATE } from '../util/statement-populate.js';

import { STATEMENT_SOURCE_POPULATE } from './statement.service.js';
import { StatementEmbeddingService } from './statement-embedding.service.js';

/** One Explore view: the scope, the node (a topic's key or `term:<key>`), the further nodes and the filters; every field of the URL */
export interface InsightSelection extends Omit<InsightScope, 'from' | 'to'> {
	from?: string;
	to?: string;
	node?: string;
	with?: string[];
	side?: InsightSide;
	kind?: StatementKind | 'unread';
	source?: InsightSource;
	subject?: StatementSubject;
	/** Only claims filed under no aspect or at a root (nothing finer fitted): the Aspects page's unfiled ones */
	loose?: boolean;
}

export const INSIGHT_DIMENSIONS = [
	'brand',
	'venue',
	'place',
	'district',
	'food',
	'aspect',
	'term',
	'source',
	'subject',
	'kind',
	'side',
	'month',
] as const;
export type InsightDimension = (typeof INSIGHT_DIMENSIONS)[number];

/** The figures every tree node and breakdown row carries */
export interface InsightCounts {
	/** Reviews, posts and other sources raising it, each once */
	sources: number;
	/** Of them, with a praise / a complaint about it */
	praise: number;
	complaints: number;
}

export interface InsightTreeNode extends InsightCounts {
	key: string;
	label: string;
	kind: string;
	parentKey?: string;
}

/** What X is: a topic with its place in the tree, or a wording with its links */
export interface InsightNodeInfo {
	ref: string;
	label: string;
	/** A topic's kind (aspect, dish, cuisine, …), or `term` */
	kind: string;
	/** The topics above it, the root first */
	path: { ref: string; label: string }[];
	hint?: string;
	/** The topics just under it */
	children: { ref: string; label: string }[];
	/** A wording's topics */
	topics: { ref: string; label: string }[];
}

export interface InsightMonth {
	month: string;
	sources: number;
	reviews: number;
	posts: number;
	/** Of the month's sources (reviews, posts) with a claim, on the side's base, percent */
	share: number | null;
	reviewShare: number | null;
	postShare: number | null;
}

export interface InsightHead {
	brand?: { id: string; name: string };
	/** The kind of place the scope is narrowed to */
	place?: { key: string; label: string };
	venue?: { id: string; name: string };
	node?: InsightNodeInfo;
	/** The ones a further node (`with`) names */
	with: InsightNodeInfo[];
	from: string;
	to: string;
	sources: number;
	reviews: number;
	posts: number;
	/** Other sources (comments, press) */
	others: number;
	brands: number;
	claims: number;
	/** The scope's sources the shares are of (with a claim; for praise or complaints with one of those; for changes with one of the three) */
	base: { sources: number; reviews: number; posts: number };
	share: number | null;
	reviewShare: number | null;
	postShare: number | null;
	/** Each side's sources, whatever `side` picks */
	sides: { side: InsightSide; sources: number }[];
	/** The window, oldest first */
	months: InsightMonth[];
	/** The last month against the one before, in points */
	change: { share: number | null; reviewShare: number | null; postShare: number | null };
	/** The numbers the claims state, per unit, a source once at its largest */
	amounts: { unit: StatementUnit; sources: number; median: number; min: number; max: number }[];
}

export interface InsightBreakdownRow extends InsightCounts {
	/** What a click narrows to: a brand or venue id, a district, a topic key or `term:<key>`, a channel, a month…; absent for "no brand", "no district" */
	key?: string;
	label: string;
	detail?: string;
}

export interface InsightBreakdown {
	by: InsightDimension;
	/** For `aspect` and `food`: the topic the rows are the children of (a click on one narrows that topic) */
	under?: { ref: string; label: string };
	rows: InsightBreakdownRow[];
	/** Rows beyond those listed */
	more: number;
}

export interface InsightGroupClaim {
	id: number;
	text: string;
	sentiment?: Sentiment;
	brandName?: string;
}

/** Claims of the view that say one thing, grouped by meaning */
export interface InsightGroup {
	claims: number;
	sources: number;
	praise: number;
	complaints: number;
	samples: InsightGroupClaim[];
	/** The phrase "See claims" searches by: the most central claim */
	like: string;
}

export interface InsightGroups {
	/** The view's claims with a vector */
	embedded: number;
	/** Of them, the ones grouped (at most `CLUSTER_MAX_CLAIMS`) */
	considered: number;
	notEmbedded: number;
	groups: InsightGroup[];
	/** Groups past the floors beyond those listed */
	more: number;
}

export interface InsightTermHit {
	ref: string;
	label: string;
	/** Statements naming it, anywhere */
	uses: number;
	topics: string[];
}

/** Explore's grouping floors: smaller than aspect discovery's, since the view is already one topic's */
export const INSIGHT_GROUP_FLOORS = { threshold: 0.82, minClaims: 3, minSources: 2, minBrands: 1 };
export const INSIGHT_GROUPS = 12;
const INSIGHT_GROUP_SAMPLES = 3;

const CHANNEL_LABELS: Record<string, string> = {
	google_review: 'Google reviews',
	tripadvisor_review: 'TripAdvisor reviews',
	tiktok: 'TikTok',
	instagram: 'Instagram',
	blog: 'Blog articles',
	comment: 'Comments',
	press: 'Press',
};
const SUBJECT_LABELS: Record<string, string> = {
	place: 'A place',
	city: 'The city',
	none: 'Nothing in particular',
};
const SIDE_LABELS: Record<string, string> = {
	praise: 'Praise',
	complaints: 'Complaints',
	noted: 'Noted',
	changes: 'Changes',
	unread: 'Not read yet',
};
const KIND_LABELS: Record<string, string> = {
	opinion: 'Opinion',
	fact: 'Fact',
	change: 'Change',
	new_item: 'New item',
	deal: 'Deal',
	event: 'Event',
	question: 'Question',
	verdict: 'Verdict',
	unread: 'Not read yet',
};

interface Resolved {
	scope: InsightScope;
	filters: InsightFilters;
	node?: NodeMatch;
	refs: string[];
	index: TopicIndex;
}

/** "[0.1,0.2]" (pgvector's text form) → numbers */
const parseVector = (text: string): number[] => text.slice(1, -1).split(',').map(Number);

/**
 * "Who talked about X, how much, and what did they say", for any X (a topic and everything under
 * it, or a wording) in any scope (a city, a brand, a branch, a district) and months: the tree's
 * counts, X's figures, a breakdown by one dimension, its claims and their groups by meaning. A
 * source counts once per node. Reads stored statements
 * only; the one reader behind `/admin/explore/*`. The SQL is the pure `util/insight-sql.ts`.
 */
@Injectable()
export class StatementInsightService {
	constructor(
		private readonly em: EntityManager,
		private readonly topicService: TopicService,
		private readonly statementEmbeddingService: StatementEmbeddingService,
	) {}

	/** Every topic the scope's claims are about, each with its descendants' sources folded in (a source once per topic) */
	async tree(selection: InsightSelection): Promise<InsightTreeNode[]> {
		const { scope, filters, index } = await this.resolve(selection);
		const cte = claimsCte(scope.cityId, scope);
		const where = whereSql([
			...scopeSql(scope),
			...populationSql(filters),
			...narrowingSql(filters),
		]);
		const query = joinSql(
			[
				sql(`with recursive anc(id, anc_id) as (${ANCESTORS_SQL}), claims as (`),
				cte,
				sql(`) select t.key, ${COUNT_FIELDS('c')} from (
					select distinct anc.anc_id as topic_id, c.* from claims c
					join (${CLAIM_TOPICS_SQL}) l on l.statement_id = c.id
					join anc on anc.id = l.topic_id`),
				where,
				sql(`) c join topics t on t.id = c.topic_id group by t.key`),
			],
			' ',
		);
		const rows = await this.run<InsightCounts & { key: string }>(query);
		return rows
			.map((r): InsightTreeNode | undefined => {
				const topic = index.get(r.key);
				return (
					topic && {
						key: r.key,
						label: topic.label,
						kind: topic.kind,
						...(topic.parentKey && { parentKey: topic.parentKey }),
						sources: r.sources,
						praise: r.praise,
						complaints: r.complaints,
					}
				);
			})
			.filter((n): n is InsightTreeNode => !!n && n.sources > 0);
	}

	/** X's figures in the scope: its sources, shares, sides, months and stated numbers */
	async head(selection: InsightSelection): Promise<InsightHead> {
		const { scope, filters, node, refs, index } = await this.resolve(selection);
		const before = shiftMonth(scope.from, -1);
		const cte = claimsCte(scope.cityId, { from: before, to: scope.to });
		const window = sql('c.month >= ?', [scope.from]);
		const nodeWhere = node ? [nodeSql(node)] : [];
		const all = [
			...scopeSql(scope),
			...populationSql(filters),
			...narrowingSql(filters),
			...nodeWhere,
		];
		const withCte = (body: Sql) => joinSql([sql('with claims as ('), cte, sql(')'), body], ' ');

		const totalsQ = this.run<
			InsightCounts & {
				reviews: number;
				posts: number;
				others: number;
				brands: number;
				claims: number;
			}
		>(
			withCte(
				joinSql(
					[
						sql(`select ${COUNT_FIELDS('c')},
							count(distinct c.source) filter (where c.source_kind = 'review')::int as reviews,
							count(distinct c.source) filter (where c.source_kind = 'post')::int as posts,
							count(distinct c.source) filter (where c.source_kind not in ('review', 'post'))::int as others,
							count(distinct c.brand_id)::int as brands,
							count(*)::int as claims
							from claims c`),
						whereSql([window, ...all]),
					],
					' ',
				),
			),
		);
		const sidesQ = this.run<{ side: InsightSide; sources: number }>(
			withCte(
				joinSql(
					[
						sql(
							'select c.side, count(distinct c.source)::int as sources from claims c',
						),
						whereSql([
							window,
							sql('c.side is not null'),
							...scopeSql(scope),
							...populationSql(filters),
							...narrowingSql({ ...filters, side: undefined }),
							...nodeWhere,
						]),
						sql('group by c.side'),
					],
					' ',
				),
			),
		);
		const perMonthQ = this.run<{ month: string; source_kind: string; sources: number }>(
			withCte(
				joinSql(
					[
						sql(
							'select c.month, c.source_kind, count(distinct c.source)::int as sources from claims c',
						),
						whereSql(all),
						sql('group by 1, 2'),
					],
					' ',
				),
			),
		);
		const basesQ = this.run<{ month: string; source_kind: string; sources: number }>(
			withCte(
				joinSql(
					[
						sql(
							'select c.month, c.source_kind, count(distinct c.source)::int as sources from claims c',
						),
						whereSql([
							...scopeSql(scope),
							...populationSql(filters),
							baseSideSql(filters.side),
						]),
						sql('group by 1, 2'),
					],
					' ',
				),
			),
		);
		// The window's base, each source once over the months
		const baseQ = this.run<{ sources: number; reviews: number; posts: number }>(
			withCte(
				joinSql(
					[
						sql(`select count(distinct c.source)::int as sources,
							count(distinct c.source) filter (where c.source_kind = 'review')::int as reviews,
							count(distinct c.source) filter (where c.source_kind = 'post')::int as posts
							from claims c`),
						whereSql([
							sql('c.month >= ?', [scope.from]),
							...scopeSql(scope),
							...populationSql(filters),
							baseSideSql(filters.side),
						]),
					],
					' ',
				),
			),
		);
		const statedQ = this.run<{ source: string; unit: StatementUnit; amount: number }>(
			withCte(
				joinSql(
					[
						sql('select c.source, c.unit, max(c.amount) as amount from claims c'),
						whereSql([
							window,
							sql('c.amount is not null and c.unit is not null'),
							...all,
						]),
						sql('group by 1, 2'),
					],
					' ',
				),
			),
		);

		// Side by side: each reads the same claims with other filters
		const [[totals], sides, perMonth, bases, [base], stated] = await Promise.all([
			totalsQ,
			sidesQ,
			perMonthQ,
			basesQ,
			baseQ,
			statedQ,
		]);
		const count = (
			rows: { month: string; source_kind: string; sources: number }[],
			month: string,
			kind?: string,
		) =>
			_.sumBy(
				rows.filter(r => r.month === month && (!kind || r.source_kind === kind)),
				r => r.sources,
			);
		const monthFigures = (month: string): InsightMonth => {
			const reviews = count(perMonth, month, 'review');
			const posts = count(perMonth, month, 'post');
			const sources = count(perMonth, month);
			return {
				month,
				sources,
				reviews,
				posts,
				share: percent(sources, count(bases, month)),
				reviewShare: percent(reviews, count(bases, month, 'review')),
				postShare: percent(posts, count(bases, month, 'post')),
			};
		};
		const months = monthsBetween(scope.from, scope.to).map(monthFigures);
		const last = months[months.length - 1];
		const prior = months.length > 1 ? months[months.length - 2] : monthFigures(before);
		const named = async (table: 'brands' | 'venues', id?: string) => {
			if (!id) return undefined;
			const [row] = await this.em
				.getConnection()
				.execute<{ id: string; name: string }[]>(
					`select id::text, name from ${table} where id = ?`,
					[id],
				);
			return row;
		};
		const brand = await named('brands', scope.brandId);
		const venue = await named('venues', scope.venueId);
		return {
			...(brand && { brand }),
			...(scope.place && { place: { key: scope.place, label: index.label(scope.place) } }),
			...(venue && { venue }),
			...(node && { node: await this.info(refs[0], index) }),
			with: await Promise.all(refs.slice(node ? 1 : 0).map(ref => this.info(ref, index))),
			from: scope.from,
			to: scope.to,
			sources: totals.sources,
			reviews: totals.reviews,
			posts: totals.posts,
			others: totals.others,
			brands: totals.brands,
			claims: totals.claims,
			base,
			share: percent(totals.sources, base.sources),
			reviewShare: percent(totals.reviews, base.reviews),
			postShare: percent(totals.posts, base.posts),
			sides: (['praise', 'complaints', 'noted', 'changes', 'unread'] as const).map(side => ({
				side,
				sources: sides.find(s => s.side === side)?.sources ?? 0,
			})),
			months,
			change: {
				share: pointsChange(last.share, prior.share),
				reviewShare: pointsChange(last.reviewShare, prior.reviewShare),
				postShare: pointsChange(last.postShare, prior.postShare),
			},
			amounts: statedAmounts(stated),
		};
	}

	/** X broken down by one dimension, the most sources first (months in order) */
	async breakdown(selection: InsightSelection, by: InsightDimension): Promise<InsightBreakdown> {
		const { scope, filters, node, refs, index } = await this.resolve(selection);
		const cte = claimsCte(scope.cityId, scope);
		const where = whereSql([
			...scopeSql(scope),
			...populationSql(filters),
			...narrowingSql(filters),
			...(node ? [nodeSql(node)] : []),
		]);
		let under: InsightBreakdown['under'];
		let keyed: Sql;
		let recursive = false;
		if (by === 'aspect' || by === 'food') {
			// The rows are the children of the deepest topic on that side of the tree, each with what is
			// under it, and that topic itself for the claims filed at it alone; else the aspects' roots
			// or every kind of food
			const parent = foldParent(refs, index, by === 'aspect');
			const keys =
				parent ?
					[parent, ...index.topics.filter(t => t.parentKey === parent).map(t => t.key)]
				: by === 'aspect' ? index.aspects.filter(t => !t.parentKey).map(t => t.key)
				: index.food.map(t => t.key);
			if (parent) under = { ref: parent, label: index.label(parent) };
			recursive = true;
			keyed = joinSql(
				[
					sql(
						`select distinct t.key, t.label, null::text as detail, c.* from claims c
						join (${CLAIM_TOPICS_SQL}) l on l.statement_id = c.id
						join anc on anc.id = l.topic_id
						join topics t on t.id = anc.anc_id and t.key in (${keys.map(() => '?').join(', ')})
							and (t.key <> ? or anc.id = anc.anc_id)`,
						[...keys, parent ?? ''],
					),
					where,
				],
				' ',
			);
		} else {
			const dimension: Record<Exclude<InsightDimension, 'aspect' | 'food'>, string> = {
				brand: `select distinct c.brand_id::text as key, b.name as label, null::text as detail, c.* from claims c left join brands b on b.id = c.brand_id`,
				venue: `select distinct c.venue_id::text as key, v.name as label, concat_ws(' · ', v.street, v.district) as detail, c.* from claims c left join venues v on v.id = c.venue_id`,
				district: `select distinct c.district as key, c.district as label, null::text as detail, c.* from claims c`,
				place: `select distinct c.place_key as key, c.place_label as label, null::text as detail, c.* from claims c`,
				term: `select distinct '${TERM_REF}' || tm.key as key, tm.name as label, null::text as detail, c.* from claims c
					join statement_parts fp on fp.statement_id = c.id and fp.role = 'food' join terms tm on tm.id = fp.term_id`,
				source: `select distinct c.channel as key, c.channel as label, null::text as detail, c.* from claims c`,
				subject: `select distinct c.subject as key, c.subject as label, null::text as detail, c.* from claims c`,
				kind: `select distinct coalesce(c.kind, 'unread') as key, coalesce(c.kind, 'unread') as label, null::text as detail, c.* from claims c`,
				side: `select distinct c.side as key, c.side as label, null::text as detail, c.* from claims c`,
				month: `select distinct c.month as key, c.month as label, null::text as detail, c.* from claims c`,
			};
			const w = whereSql([
				...scopeSql(scope),
				...populationSql(filters),
				...narrowingSql(filters),
				...(node ? [nodeSql(node)] : []),
			]);
			keyed = joinSql([sql(dimension[by]), w], ' ');
		}
		const query = joinSql(
			[
				sql(
					`with ${recursive ? `recursive anc(id, anc_id) as (${ANCESTORS_SQL}), ` : ''}claims as (`,
				),
				cte,
				sql(
					`) select key, label, detail, ${COUNT_FIELDS('c')}, count(*) over ()::int as total from (`,
				),
				keyed,
				sql(
					`) c group by key, label, detail order by ${by === 'month' ? 'key' : 'sources desc, label'} limit ?`,
					[INSIGHT_BREAKDOWN_ROWS],
				),
			],
			' ',
		);
		const rows = await this.run<
			InsightCounts & {
				key: string | null;
				label: string | null;
				detail: string | null;
				total: number;
			}
		>(query);
		const labelOf = (r: { key: string | null; label: string | null }): string => {
			if (by === 'source') return CHANNEL_LABELS[r.key ?? ''] ?? r.key ?? 'Unknown';
			if (by === 'subject') return SUBJECT_LABELS[r.key ?? ''] ?? r.key ?? '';
			if (by === 'side') return SIDE_LABELS[r.key ?? ''] ?? r.key ?? '';
			if (by === 'kind') return KIND_LABELS[r.key ?? ''] ?? r.key ?? '';
			if ((by === 'aspect' || by === 'food') && under && r.key === under.ref)
				return `${under.label}, nothing finer`;
			if (r.label) return r.label;
			return (
				by === 'brand' ? 'No brand: the city or nothing'
				: by === 'venue' ? 'No branch named'
				: by === 'district' ? 'No district'
				: by === 'place' ? 'No known food'
				: '—'
			);
		};
		return {
			by,
			...(under && { under }),
			rows: rows.map(r => ({
				...(r.key !== null && { key: r.key }),
				label: labelOf(r),
				...(r.detail && { detail: r.detail }),
				sources: r.sources,
				praise: r.praise,
				complaints: r.complaints,
			})),
			more: Math.max(0, (rows[0]?.total ?? 0) - rows.length),
		};
	}

	/**
	 * A page of X's claims in the view, newest first, or closest in meaning to `like` (only claims
	 * with a vector; `notEmbedded` counts the rest), with their sources as the Claims tables show them
	 */
	async claims(
		selection: InsightSelection,
		page: { offset: number; limit: number; q?: string; like?: string },
	): Promise<{ total: number; items: Statement[]; notEmbedded?: number }> {
		const { scope, filters, node } = await this.resolve(selection);
		const cte = claimsCte(scope.cityId, scope);
		const q = page.q?.trim();
		const like = page.like?.trim();
		const conditions = [
			...scopeSql(scope),
			...populationSql(filters),
			...narrowingSql(filters),
			...(node ? [nodeSql(node)] : []),
			...(q ? [sql(`c.text ilike ?`, [`%${q.replace(/[\\%_]/g, ch => `\\${ch}`)}%`])] : []),
		];
		const withCte = (body: Sql) => joinSql([sql('with claims as ('), cte, sql(')'), body], ' ');
		let ids: number[];
		let total: number;
		let notEmbedded: number | undefined;
		if (!like) {
			[{ total }] = await this.run<{ total: number }>(
				withCte(
					joinSql(
						[sql('select count(*)::int as total from claims c'), whereSql(conditions)],
						' ',
					),
				),
			);
			const rows = await this.run<{ id: number }>(
				withCte(
					joinSql(
						[
							sql('select c.id from claims c'),
							whereSql(conditions),
							sql('order by c.said_at desc, c.id desc limit ? offset ?', [
								page.limit,
								page.offset,
							]),
						],
						' ',
					),
				),
			);
			ids = rows.map(r => Number(r.id));
		} else {
			const vector = toVectorLiteral(await this.statementEmbeddingService.phraseVector(like));
			const [counts] = await this.run<{ total: number; notEmbedded: number }>(
				withCte(
					joinSql(
						[
							sql(`select count(*) filter (where e.embedded_at is not null)::int as total,
								count(*) filter (where e.embedded_at is null and c.text is not null)::int as "notEmbedded"
								from claims c join statements e on e.id = c.id`),
							whereSql(conditions),
						],
						' ',
					),
				),
			);
			total = counts.total;
			notEmbedded = counts.notEmbedded;
			const rows = await this.run<{ id: number }>(
				withCte(
					joinSql(
						[
							sql('select c.id from claims c join statements e on e.id = c.id'),
							whereSql([...conditions, sql('e.embedded_at is not null')]),
							sql(
								`order by e.embedding <=> ?::halfvec(${STATEMENT_EMBEDDING_DIMENSIONS}), c.id desc limit ? offset ?`,
								[vector, page.limit, page.offset],
							),
						],
						' ',
					),
				),
			);
			ids = rows.map(r => Number(r.id));
		}
		const found =
			ids.length ?
				await this.em.find(
					Statement,
					{ id: { $in: ids } },
					{
						populate: [...STATEMENT_PARTS_POPULATE, ...STATEMENT_SOURCE_POPULATE],
					},
				)
			:	[];
		const byId = new Map(found.map(s => [s.id, s]));
		return {
			total,
			items: ids.map(id => byId.get(id)).filter(s => !!s) as Statement[],
			...(notEmbedded !== undefined && { notEmbedded }),
		};
	}

	/**
	 * X's claims in the view grouped by meaning (aspect discovery's greedy cosine pass over
	 * the vectors' first `CLUSTER_DIMENSIONS`, at `INSIGHT_GROUP_FLOORS`), largest first. Nothing is
	 * stored or named: each group shows its most central claims, and its count is a reading aid,
	 * never a figure a report quotes. Empty until the claims have vectors.
	 */
	async groups(selection: InsightSelection): Promise<InsightGroups> {
		const { scope, filters, node } = await this.resolve(selection);
		const cte = claimsCte(scope.cityId, scope);
		const conditions = [
			sql('c.text is not null'),
			...scopeSql(scope),
			...populationSql(filters),
			...narrowingSql(filters),
			...(node ? [nodeSql(node)] : []),
		];
		const withCte = (body: Sql) => joinSql([sql('with claims as ('), cte, sql(')'), body], ' ');
		const [counts] = await this.run<{ embedded: number; notEmbedded: number }>(
			withCte(
				joinSql(
					[
						sql(`select count(*) filter (where e.embedded_at is not null)::int as embedded,
							count(*) filter (where e.embedded_at is null)::int as "notEmbedded"
							from claims c join statements e on e.id = c.id`),
						whereSql(conditions),
					],
					' ',
				),
			),
		);
		if (!counts.embedded) return { ...counts, considered: 0, groups: [], more: 0 };
		const raw = await this.run<{
			id: number;
			text: string;
			sentiment: Sentiment | null;
			side: string | null;
			source: string;
			brand_id: string | null;
			brand_name: string | null;
			vector: string;
		}>(
			withCte(
				joinSql(
					[
						sql(`select c.id, c.text, c.sentiment, c.side, c.source, c.brand_id::text, b.name as brand_name,
							subvector(e.embedding, 1, ${CLUSTER_DIMENSIONS})::text as vector
							from claims c join statements e on e.id = c.id left join brands b on b.id = c.brand_id`),
						whereSql([...conditions, sql('e.embedded_at is not null')]),
						sql('order by md5(c.id::text) limit ?', [CLUSTER_MAX_CLAIMS]),
					],
					' ',
				),
			),
		);
		const items = raw.map(r => ({
			id: Number(r.id),
			vector: parseVector(r.vector),
			source: r.source,
			brand: r.brand_id ?? 'city',
			text: r.text,
			sentiment: r.sentiment,
			side: r.side,
			brandName: r.brand_name,
		})) satisfies ClusterItem[];
		const found = clusterClaims(items, INSIGHT_GROUP_FLOORS);
		const sourcesOf = (list: typeof items, side: string) =>
			new Set(list.filter(i => i.side === side).map(i => i.source)).size;
		const listed = found.slice(0, INSIGHT_GROUPS);
		const groups: InsightGroup[] = listed.map(cluster => {
			const samples = diverseSamples(
				cluster.items,
				INSIGHT_GROUP_SAMPLES,
				CLUSTER_SAMPLE_THRESHOLD,
			).map(i => ({
				id: i.id,
				text: i.text,
				...(i.sentiment && { sentiment: i.sentiment }),
				...(i.brandName && { brandName: i.brandName }),
			}));
			return {
				claims: cluster.items.length,
				sources: cluster.sources,
				praise: sourcesOf(cluster.items, 'praise'),
				complaints: sourcesOf(cluster.items, 'complaints'),
				samples,
				like: samples[0].text,
			};
		});
		return {
			...counts,
			considered: items.length,
			groups,
			more: Math.max(0, found.length - groups.length),
		};
	}

	/** Wordings whose name or key holds `q`, the most used first: what the tree's search finds besides topics */
	async terms(q: string): Promise<InsightTermHit[]> {
		const text = q.trim();
		if (!text) return [];
		const pattern = `%${text.replace(/[\\%_]/g, ch => `\\${ch}`)}%`;
		const rows = await this.em
			.getConnection()
			.execute<{ key: string; name: string; uses: number; topics: string[] | null }[]>(
				`select tm.key, tm.name,
				(select count(*) from statement_parts fp where fp.term_id = tm.id)::int as uses,
				(select array_agg(t.label order by tt.rank) from term_topics tt join topics t on t.id = tt.topic_id
					where tt.term_id = tm.id and t.deleted_at is null) as topics
			from terms tm where tm.name ilike ? or tm.key ilike ?
			order by uses desc, tm.name limit 12`,
				[pattern, pattern],
			);
		return rows
			.filter(r => r.uses > 0)
			.map(r => ({
				ref: termRef(r.key),
				label: r.name,
				uses: r.uses,
				topics: r.topics ?? [],
			}));
	}

	/** The selection checked and resolved: the window, the nodes as topic keys with their descendants or a wording */
	private async resolve(selection: InsightSelection): Promise<Resolved> {
		const to = selection.to ?? previousMonth();
		const from = selection.from ?? shiftMonth(to, -(INSIGHT_DEFAULT_MONTHS - 1));
		if (from > to) throw new BadRequestException('`from` is after `to`');
		if (monthsBetween(from, to).length > INSIGHT_MAX_MONTHS)
			throw new BadRequestException(`At most ${INSIGHT_MAX_MONTHS} months`);
		const index = await this.topicService.index();
		const refs = [...(selection.node ? [selection.node] : []), ...(selection.with ?? [])];
		const matches = await Promise.all(refs.map(ref => this.match(ref, index)));
		return {
			scope: {
				cityId: selection.cityId,
				brandId: selection.brandId,
				venueId: selection.venueId,
				district: selection.district,
				place: selection.place,
				from,
				to,
			},
			filters: {
				side: selection.side,
				kind: selection.kind,
				source: selection.source,
				subject: selection.subject,
				with: matches.slice(selection.node ? 1 : 0),
				...(selection.loose && { loose: true }),
			},
			node: selection.node ? matches[0] : undefined,
			refs,
			index,
		};
	}

	private async match(ref: string, index: TopicIndex): Promise<NodeMatch> {
		if (isTermRef(ref)) {
			const key = ref.slice(TERM_REF.length);
			const [found] = await this.em
				.getConnection()
				.execute<{ key: string }[]>('select key from terms where key = ?', [key]);
			if (!found) throw new NotFoundException(`No wording ${key}`);
			return { term: key };
		}
		const topics = index.descendants(ref);
		if (!topics.length) throw new NotFoundException(`No topic ${ref}`);
		return { topics };
	}

	private async info(ref: string, index: TopicIndex): Promise<InsightNodeInfo> {
		if (isTermRef(ref)) {
			const key = ref.slice(TERM_REF.length);
			const rows = await this.em
				.getConnection()
				.execute<{ name: string; topic: string | null }[]>(
					`select tm.name, t.key as topic from terms tm
					left join term_topics tt on tt.term_id = tm.id
					left join topics t on t.id = tt.topic_id and t.deleted_at is null
				where tm.key = ? order by tt.rank`,
					[key],
				);
			return {
				ref,
				label: rows[0]?.name ?? key,
				kind: 'term',
				path: [],
				children: [],
				topics: rows
					.filter(r => r.topic && index.get(r.topic))
					.map(r => ({ ref: r.topic!, label: index.label(r.topic!) })),
			};
		}
		const topic = index.get(ref)!;
		const path: { ref: string; label: string }[] = [];
		for (
			let t = topic.parentKey ? index.get(topic.parentKey) : undefined;
			t && path.length < 20;
			t = t.parentKey ? index.get(t.parentKey) : undefined
		)
			path.unshift({ ref: t.key, label: t.label });
		return {
			ref,
			label: topic.label,
			kind: topic.kind,
			path,
			...(topic.hint && { hint: topic.hint }),
			children: index.topics
				.filter(t => t.parentKey === ref)
				.sort((a, b) => a.label.localeCompare(b.label))
				.map(t => ({ ref: t.key, label: t.label })),
			topics: [],
		};
	}

	private run<T>(query: Sql): Promise<T[]> {
		return this.em.getConnection().execute<T[]>(query.text, query.params as never[]);
	}
}
