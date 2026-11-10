import { type FilterQuery, QueryOrder, raw } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { BadRequestException, Injectable } from '@nestjs/common';

import _ from 'lodash';

import { Mention } from 'src/modules/social/entities/mention.entity.js';
import { SocialPost } from 'src/modules/social/entities/social-post.entity.js';
import { ownPostSql } from 'src/modules/social/util/accounts.js';
import { TopicService } from 'src/modules/topics/services/topic.service.js';
import { Review } from 'src/modules/venues/entities/review.entity.js';
import { monthRange } from 'src/modules/venues/util/month.js';
import { toVectorLiteral } from 'src/shared/util/vector.js';

import { STATEMENT_EMBEDDING_DIMENSIONS } from '../constants/embeddings.constant.js';
import { STATEMENT_KINDS, type StatementKind } from '../constants/kind.constant.js';
import type { Sentiment } from '../constants/sentiment.constant.js';
import {
	Statement,
	type StatementSubject,
	type StatementUnit,
} from '../entities/statement.entity.js';
import { statedAmount } from '../util/amounts.js';
import { verbatimQuote } from '../util/quotes.js';
import { STATEMENT_PARTS_POPULATE } from '../util/statement-populate.js';

import { StatementEmbeddingService } from './statement-embedding.service.js';

/**
 * One claim as agent A answers it: one thing said, in English, the source's own words for it, and
 * what A copied out of the text (`CLAIM_FOODS_RULE`, `CLAIM_AMOUNT_RULE`)
 */
export interface Claim {
	text: string;
	/** Kept only when it is verbatim in the source (`verbatimQuote`) */
	quote?: string | null;
	/** The food wordings as spelled: stored as food parts by `StatementPartsService.read` */
	foods?: string[];
	/** The number it states, with its unit: stored on the claim as written */
	amount?: number | null;
	unit?: StatementUnit | null;
}

/** What a new claim keeps of A's copies: its number now (the labeller may parse one later), its foods until they become parts */
const copied = (claim: Claim) => {
	const stated = statedAmount(claim.amount, claim.unit);
	return {
		...(stated && { amount: stated.amount, unit: stated.unit }),
		...(claim.foods?.length && { foodsFromA: claim.foods }),
	};
};

/** A post's or article's claim: who it is about (a place it names, by index into the places answered; the city; nothing) */
export interface PostClaim extends Claim {
	subject: StatementSubject;
	/** The index of the place in the answer's places, for `subject` place */
	place?: number | null;
}

/** "How many venues had a waiting complaint, and how long": a city's month */
export interface WaitComplaints {
	month: string;
	/** Places with a wait complaint in a review or a post by others (a brand-only post counts its brand) */
	venues: number;
	brands: number;
	/** Reviews and posts raising one */
	sources: number;
	reviews: number;
	posts: number;
	byTheme: { theme: string; venues: number; brands: number; sources: number }[];
	/** The minutes complaints state */
	stated: {
		complaints: number;
		of: number;
		median?: number;
		upperQuartile?: number;
		max?: number;
	};
}

/** YYYY-MM in UTC */
export const monthOf = (date: Date) => date.toISOString().slice(0, 7);

/** Each claim once (case aside), trimmed, empty ones out */
const uniqueClaims = <T extends Claim>(claims: T[]): T[] =>
	_.uniqBy(
		claims.map(c => ({ ...c, text: c.text.trim() })).filter(c => c.text),
		c => c.text.toLowerCase(),
	);

/**
 * What posts, articles and reviews say, one claim per row (`Statement`): the one writer. A
 * statement is written with its source, in the caller's unit of work, with no sentiment and no
 * labels, its number when agent A stated one: the labeller (`StatementPartsService`) reads the rest
 * right after (A's foods kept in memory until then, `foodsFromA`), or the `statement-parts`
 * backlog does. Every reader joins brand and venue through the source, never copied here.
 */
@Injectable()
export class StatementService {
	constructor(
		private readonly em: EntityManager,
		private readonly topicService: TopicService,
		private readonly statementEmbeddingService: StatementEmbeddingService,
	) {}

	/**
	 * Replaces a review's statements with agent A's claims (its venue is the subject), in the
	 * caller's unit of work. `review.statements` must be loaded (or the review new), and its venue.
	 */
	replaceForReview(review: Review, claims: Claim[]): Statement[] {
		if (!review.statements.isInitialized())
			throw new Error(
				'StatementService.replaceForReview needs the review with its statements loaded',
			);
		const city = review.venue.city;
		if (!city)
			throw new Error("StatementService.replaceForReview needs the review's venue loaded");
		review.statements.removeAll();
		return uniqueClaims(claims).map(claim =>
			this.em.create(Statement, {
				sourceKind: 'review',
				review,
				subject: 'place',
				city,
				month: monthOf(review.publishedAt),
				saidAt: review.publishedAt,
				text: claim.text,
				quote: verbatimQuote(claim.quote, [review.text, review.textTranslated]),
				...copied(claim),
			}),
		);
	}

	/**
	 * Replaces a post's or article's statements with agent A's claims: a claim about a place it
	 * names carries that `mention` (`places[claim.place]`), a claim about the city or nothing has
	 * none. A place index the answer has no place for is a claim about nothing. The statements of
	 * the `keep` mentions stay (the additive re-read: a stored mention the answer didn't pair). In
	 * the caller's unit of work; `post.statements` must be loaded (or the post not analysed
	 * before), and its city.
	 */
	replaceForPost(
		post: SocialPost,
		claims: PostClaim[],
		places: (Mention | null | undefined)[],
		keep: Mention[] = [],
	): Statement[] {
		if (!post.statements.isInitialized())
			throw new Error(
				'StatementService.replaceForPost needs the post with its statements loaded',
			);
		const kept = new Set(keep.map(m => m.id));
		for (const statement of post.statements.getItems())
			if (!statement.mention || !kept.has(statement.mention.id))
				post.statements.remove(statement);
		return uniqueClaims(claims).map(claim => {
			const mention =
				claim.subject === 'place' && claim.place != null ? places[claim.place] : undefined;
			return this.em.create(Statement, {
				sourceKind: 'post',
				post,
				mention: mention ?? null,
				subject:
					mention ? 'place'
					: claim.subject === 'city' ? 'city'
					: 'none',
				city: post.city,
				month: monthOf(post.postedAt),
				saidAt: post.postedAt,
				text: claim.text,
				quote: verbatimQuote(claim.quote, [post.text, post.subtitles]),
				...copied(claim),
			});
		});
	}

	/**
	 * A city's month of waiting complaints: the places, brands and sources with a negative claim
	 * under any `wait` aspect (a place once, however many), per aspect, and the minutes the claims
	 * state. Reviews of the city's venues with text, and matched mentions in posts by others (own
	 * posts out); a mention without a branch counts its brand.
	 */
	async waitComplaints(cityId: string, month: string): Promise<WaitComplaints> {
		const { start, end } = monthRange(month);
		const waitAspects = (await this.topicService.index()).descendants('wait');
		if (!waitAspects.length)
			return {
				month,
				venues: 0,
				brands: 0,
				sources: 0,
				reviews: 0,
				posts: 0,
				byTheme: [],
				stated: { complaints: 0, of: 0 },
			};
		const keys = waitAspects.map(() => '?').join(', ');
		const part = `join statement_parts p on p.statement_id = s.id and p.role = 'aspect'
			join topics t on t.id = p.topic_id and t.key in (${keys})`;
		const rows: {
			theme: string;
			source: string;
			venue: string | null;
			brand: string;
			kind: 'review' | 'post';
			amount: number | null;
			unit: string | null;
		}[] = await this.em.getConnection().execute(
			`select t.key as theme, 'r' || r.id as source, r.venue_id as venue, v.brand_id as brand, 'review' as kind, s.amount, s.unit
			from statements s ${part}
			join reviews r on r.id = s.review_id
			join venues v on v.id = r.venue_id
			where s.city_id = ? and s.month = ? and s.sentiment = 'negative'
				and coalesce(r.text_translated, r.text, '') <> ''
			union all
			select t.key as theme, 'p' || po.id as source, m.venue_id as venue, m.brand_id as brand, 'post' as kind, s.amount, s.unit
			from statements s ${part}
			join mentions m on m.id = s.mention_id
			join social_posts po on po.id = m.post_id
			where s.city_id = ? and s.month = ? and s.sentiment = 'negative'
				and m.brand_id is not null and po.posted_at >= ? and po.posted_at < ?
				and not ${ownPostSql('po', 'm.brand_id')}`,
			[...waitAspects, cityId, month, ...waitAspects, cityId, month, start, end],
		);
		const place = (r: (typeof rows)[number]) => r.venue ?? `brand:${r.brand}`;
		const count = (list: typeof rows) => ({
			venues: new Set(list.map(place)).size,
			brands: new Set(list.map(r => r.brand)).size,
			sources: new Set(list.map(r => r.source)).size,
		});
		// A complaint is a source's claim; a source stating two waits keeps its longest
		const stated = Object.values(
			_.groupBy(
				rows.filter(r => r.unit === 'minutes' && r.amount != null),
				r => r.source,
			),
		).map(group => _.max(group.map(r => r.amount!))!);
		const quantile = (q: number) => {
			if (!stated.length) return undefined;
			const sorted = [...stated].sort((a, b) => a - b);
			const pos = (sorted.length - 1) * q;
			const lo = Math.floor(pos);
			return sorted[lo] + (sorted[Math.ceil(pos)] - sorted[lo]) * (pos - lo);
		};
		return {
			month,
			...count(rows),
			reviews: new Set(rows.filter(r => r.kind === 'review').map(r => r.source)).size,
			posts: new Set(rows.filter(r => r.kind === 'post').map(r => r.source)).size,
			byTheme: waitAspects
				.map(theme => ({ theme, ...count(rows.filter(r => r.theme === theme)) }))
				.filter(t => t.sources),
			stated: {
				complaints: stated.length,
				of: new Set(rows.map(r => r.source)).size,
				median: quantile(0.5),
				upperQuartile: quantile(0.75),
				max: stated.length ? Math.max(...stated) : undefined,
			},
		};
	}

	/**
	 * A scope's claims, newest first, narrowed by the filters (the admin's Claims tables: what
	 * agents A and B made of the sources). An aspect matches the claims under it or any aspect below
	 * it; an unknown key matches none. With `like` (a phrase) the page is ordered by cosine distance
	 * to the phrase's vector instead, only claims with a vector are listed, and `notEmbedded` counts
	 * the claims the filters match that have none yet. The scope's figures as a whole are `summary`.
	 */
	async list(
		query: StatementListQuery,
	): Promise<{ total: number; items: Statement[]; notEmbedded?: number }> {
		const where: FilterQuery<Statement> = {};
		const and: FilterQuery<Statement>[] = [scopeFilter(query)];
		if (query.month) where.month = query.month;
		if (query.sourceKind) where.sourceKind = query.sourceKind;
		if (query.subject) where.subject = query.subject;
		if (query.sentiment)
			where.sentiment = query.sentiment === 'unread' ? null : query.sentiment;
		if (query.kind) where.kind = query.kind === 'unread' ? null : query.kind;
		if (query.q?.trim())
			where.text = { $ilike: `%${query.q.trim().replace(/[\\%_]/g, c => `\\${c}`)}%` };
		if (query.aspect) {
			const index = await this.topicService.index();
			const keys = index.isAspect(query.aspect) ? index.descendants(query.aspect) : [];
			and.push({
				parts: {
					$some: { role: 'aspect', topic: { key: { $in: keys.length ? keys : ['-'] } } },
				},
			});
		}
		if (query.parts === 'none') and.push({ parts: { $none: {} } });
		else if (query.parts === 'no_aspect') and.push({ parts: { $none: { role: 'aspect' } } });
		else if (query.parts === 'food') and.push({ parts: { $some: { role: 'food' } } });
		const like = query.like?.trim();
		const offset = query.offset ?? 0;
		const limit = query.limit ?? 50;
		if (!like) {
			const [page, total] = await this.em.findAndCount(
				Statement,
				{ $and: [where, ...and] },
				{
					fields: ['id'],
					orderBy: { saidAt: QueryOrder.DESC, id: QueryOrder.DESC },
					offset,
					limit,
				},
			);
			return { total, items: await this.loadPage(page.map(s => s.id)) };
		}
		const vector = toVectorLiteral(await this.statementEmbeddingService.phraseVector(like));
		const distance = raw(
			alias => `${alias}.embedding <=> ?::halfvec(${STATEMENT_EMBEDDING_DIMENSIONS})`,
			[vector],
		);
		const [page, total] = await this.em.findAndCount(
			Statement,
			{ $and: [where, ...and, { embeddedAt: { $ne: null } }] },
			{
				fields: ['id'],
				// A raw key goes in its own object: MikroORM refuses one mixed with fields
				orderBy: [{ [distance]: QueryOrder.ASC }, { id: QueryOrder.DESC }],
				offset,
				limit,
			},
		);
		const items = await this.loadPage(page.map(s => s.id));
		const notEmbedded = await this.em.count(Statement, {
			$and: [where, ...and, { text: { $ne: null }, embeddedAt: null }],
		});
		return { total, items, notEmbedded };
	}

	/**
	 * A page's claims with their parts and sources, in the order of `ids`. The page is picked by
	 * ids first: one query joining every source table over a whole city's claims before its limit
	 * ran as a parallel hash join that outgrew Postgres' shared memory (Docker's 64 MB).
	 */
	private async loadPage(ids: number[]): Promise<Statement[]> {
		if (!ids.length) return [];
		const rows = await this.em.find(
			Statement,
			{ id: { $in: ids } },
			{ populate: [...STATEMENT_PARTS_POPULATE, ...STATEMENT_SOURCE_POPULATE] },
		);
		const byId = new Map(rows.map(r => [r.id, r]));
		return ids.map(id => byId.get(id)).filter(s => s !== undefined) as Statement[];
	}

	/** How a scope's claims (a city's, a brand's, a branch's; a month or all) were split and read, whatever a list filters */
	async summary(scope: StatementScope): Promise<StatementSummary> {
		scopeFilter(scope);
		const where: [string, string[]][] = [];
		if (scope.cityId) where.push(['s.city_id = ?', [scope.cityId]]);
		if (scope.month) where.push(['s.month = ?', [scope.month]]);
		if (scope.brandId)
			where.push(['(rv.brand_id = ? or m.brand_id = ?)', [scope.brandId, scope.brandId]]);
		if (scope.venueId)
			where.push(['(r.venue_id = ? or m.venue_id = ?)', [scope.venueId, scope.venueId]]);
		const part = (where = '') =>
			`exists (select 1 from statement_parts p where p.statement_id = s.id${where ? ` and ${where}` : ''})`;
		const [row] = await this.em.getConnection().execute<StatementSummary[]>(
			`select count(*)::int as statements,
				count(*) filter (where s.source_kind = 'review')::int as reviews,
				count(*) filter (where s.source_kind = 'post')::int as posts,
				count(*) filter (where s.subject = 'place')::int as place,
				count(*) filter (where s.subject = 'city')::int as city,
				count(*) filter (where s.subject = 'none')::int as none,
				count(*) filter (where s.sentiment = 'positive')::int as positive,
				count(*) filter (where s.sentiment = 'negative')::int as negative,
				count(*) filter (where s.sentiment = 'neutral')::int as neutral,
				count(*) filter (where s.sentiment = 'mixed')::int as mixed,
				count(*) filter (where s.sentiment is null)::int as unread,
				json_build_object(${STATEMENT_KINDS.map(k => `'${k}', count(*) filter (where s.kind = '${k}')`).join(', ')}) as kinds,
				count(*) filter (where not ${part()})::int as "noParts",
				count(*) filter (where not ${part(`p.role = 'aspect'`)})::int as "noAspect",
				count(*) filter (where ${part(`p.role = 'food'`)})::int as "withFood"
			from statements s
			left join reviews r on r.id = s.review_id
			left join venues rv on rv.id = r.venue_id
			left join mentions m on m.id = s.mention_id
			where ${where.map(([sql]) => sql).join(' and ')}`,
			where.flatMap(([, params]) => params),
		);
		return row;
	}
}

/** Whose claims: a city's, a brand's or a branch's (at least one), of a month or all */
export interface StatementScope {
	cityId?: string;
	/** Its branches' reviews and the posts' claims about it (`mention.brand`) */
	brandId?: string;
	/** Its reviews and the posts' claims about it (`mention.venue`) */
	venueId?: string;
	month?: string;
}

/** The claims of a scope a brand or a branch is: joined through the source, never stored on the claim */
const scopeFilter = (scope: StatementScope): FilterQuery<Statement> => {
	if (!scope.cityId && !scope.brandId && !scope.venueId)
		throw new BadRequestException('A city, a brand or a venue is needed');
	const and: FilterQuery<Statement>[] = [];
	if (scope.cityId) and.push({ city: scope.cityId });
	if (scope.brandId)
		and.push({
			$or: [
				{ review: { venue: { brand: scope.brandId } } },
				{ mention: { brand: scope.brandId } },
			],
		});
	if (scope.venueId)
		and.push({
			$or: [{ review: { venue: scope.venueId } }, { mention: { venue: scope.venueId } }],
		});
	return { $and: and };
};

/** What `StatementService.list` narrows a scope by */
export interface StatementListQuery extends StatementScope {
	sourceKind?: 'review' | 'post';
	subject?: StatementSubject;
	/** `unread`: no sentiment yet */
	sentiment?: Sentiment | 'unread';
	/** An aspect's key, its descendants included */
	aspect?: string;
	/** `none`: no part; `no_aspect`: under no aspect; `food`: with a food wording */
	parts?: 'none' | 'no_aspect' | 'food';
	/** One kind, or `unread`: not read by agent B yet */
	kind?: StatementKind | 'unread';
	q?: string;
	/** A phrase: the claims closest in meaning first (cosine distance of the vectors) */
	like?: string;
	offset?: number;
	limit?: number;
}

export interface StatementSummary {
	statements: number;
	reviews: number;
	posts: number;
	place: number;
	city: number;
	none: number;
	positive: number;
	negative: number;
	neutral: number;
	mixed: number;
	unread: number;
	/** Claims per kind (`STATEMENT_KINDS`); the rest are not read yet */
	kinds: Record<StatementKind, number>;
	noParts: number;
	noAspect: number;
	withFood: number;
}

/** Where a listed claim was said: the review and its venue, or the post and the place it is about */
export const STATEMENT_SOURCE_POPULATE = [
	'review.venue',
	'post.account',
	'mention.brand',
	'mention.venue',
] as const;
